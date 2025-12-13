const net = require('net');
const EventEmitter = require('events');

/**
 * Socket 连接管理器
 * 管理 TCP Socket 连接池，防止内存泄漏
 *
 * 功能：
 * - 连接超时控制（30秒）
 * - 空闲超时控制（5分钟无数据传输自动断开）
 * - 连接数上限（默认100个）
 * - LRU 清理策略
 * - 自动清理失效连接
 * - 心跳检测
 *
 * @class SocketConnectionManager
 * @extends EventEmitter
 *
 * @fires SocketConnectionManager#connected - 连接建立
 * @fires SocketConnectionManager#disconnected - 连接断开
 * @fires SocketConnectionManager#timeout - 连接超时
 * @fires SocketConnectionManager#error - 连接错误
 * @fires SocketConnectionManager#data - 数据接收
 *
 * @example
 * const manager = new SocketConnectionManager({
 *   timeout: 30000,
 *   maxConnections: 100,
 *   idleTimeout: 300000
 * });
 *
 * const socket = manager.createConnection('device-123', '192.168.1.100', 55443);
 * socket.on('data', (data) => console.log(data));
 */
class SocketConnectionManager extends EventEmitter {
  constructor(options = {}) {
    super();

    // 配置参数
    this.connectionTimeout = options.timeout || 30000; // 30秒连接超时
    this.maxConnections = options.maxConnections || 100; // 最大连接数
    this.idleTimeout = options.idleTimeout || 300000; // 5分钟空闲超时
    this.heartbeatInterval = options.heartbeatInterval || 60000; // 1分钟心跳检测

    // 连接池
    this.sockets = new Map(); // deviceId -> { socket, metadata }

    // 访问顺序（用于 LRU）
    this.accessOrder = [];

    // 启动定期清理任务
    this.cleanupInterval = setInterval(() => this.cleanupIdleConnections(), 30000); // 每30秒检查一次

    // 启动心跳检测
    this.heartbeatTask = setInterval(() => this.performHeartbeat(), this.heartbeatInterval);
  }

  /**
   * 创建新的 TCP 连接
   *
   * @param {string} deviceId - 设备ID
   * @param {string} host - 主机地址
   * @param {number} port - 端口号
   * @returns {net.Socket} TCP Socket 对象
   *
   * @example
   * const socket = manager.createConnection('device-123', '192.168.1.100', 55443);
   */
  createConnection(deviceId, host, port) {
    // 检查是否已存在连接
    if (this.sockets.has(deviceId)) {
      const existing = this.sockets.get(deviceId);
      // 如果现有连接仍然有效，返回它
      if (existing.socket && !existing.socket.destroyed) {
        this.updateAccessOrder(deviceId);
        return existing.socket;
      } else {
        // 现有连接已失效，清理它
        this.closeConnection(deviceId);
      }
    }

    // 检查连接数上限
    if (this.sockets.size >= this.maxConnections) {
      this.cleanupIdleConnections();

      // 如果清理后仍然超过上限，删除最久未使用的连接（LRU）
      if (this.sockets.size >= this.maxConnections) {
        const oldestDeviceId = this.accessOrder.shift();
        if (oldestDeviceId) {
          this.closeConnection(oldestDeviceId);
        }
      }
    }

    // 创建新连接
    const socket = net.createConnection({ host, port, timeout: this.connectionTimeout }, () => {
      console.log(`SocketConnectionManager: 已连接到设备 ${deviceId} (${host}:${port})`);
      this.emit('connected', deviceId);
    });

    // 连接元数据
    const metadata = {
      socket,
      deviceId,
      host,
      port,
      connectedAt: Date.now(),
      lastActivity: Date.now(),
      isAlive: true,
      bytesReceived: 0,
      bytesSent: 0
    };

    // 设置超时处理
    socket.setTimeout(this.connectionTimeout);
    socket.on('timeout', () => {
      console.warn(`SocketConnectionManager: 设备 ${deviceId} 连接超时`);
      this.emit('timeout', deviceId);
      this.closeConnection(deviceId);
    });

    // 数据接收处理
    socket.on('data', (data) => {
      metadata.lastActivity = Date.now();
      metadata.bytesReceived += data.length;
      metadata.isAlive = true; // 标记为活跃
      this.updateAccessOrder(deviceId);
      this.emit('data', deviceId, data);
    });

    // 错误处理
    socket.on('error', (error) => {
      console.error(`SocketConnectionManager: 设备 ${deviceId} 连接错误:`, error.message);
      this.emit('error', deviceId, error);
      this.closeConnection(deviceId);
    });

    // 关闭处理
    socket.on('close', () => {
      console.log(`SocketConnectionManager: 设备 ${deviceId} 连接已关闭`);
      this.emit('disconnected', deviceId);
      this.sockets.delete(deviceId);
      this.removeFromAccessOrder(deviceId);
    });

    // 保存到连接池
    this.sockets.set(deviceId, metadata);
    this.accessOrder.push(deviceId);

    return socket;
  }

  /**
   * 获取指定设备的 Socket
   *
   * @param {string} deviceId - 设备ID
   * @returns {net.Socket|null} Socket 对象，如果不存在返回 null
   */
  getSocket(deviceId) {
    if (!this.sockets.has(deviceId)) {
      return null;
    }

    const metadata = this.sockets.get(deviceId);
    if (metadata.socket && !metadata.socket.destroyed) {
      this.updateAccessOrder(deviceId);
      return metadata.socket;
    }

    // Socket 已失效
    this.closeConnection(deviceId);
    return null;
  }

  /**
   * 检查连接是否存在且有效
   *
   * @param {string} deviceId - 设备ID
   * @returns {boolean} 是否存在有效连接
   */
  hasConnection(deviceId) {
    if (!this.sockets.has(deviceId)) {
      return false;
    }

    const metadata = this.sockets.get(deviceId);
    return metadata.socket && !metadata.socket.destroyed && metadata.socket.writable;
  }

  /**
   * 关闭指定设备的连接
   *
   * @param {string} deviceId - 设备ID
   * @returns {boolean} 是否成功关闭
   */
  closeConnection(deviceId) {
    const metadata = this.sockets.get(deviceId);
    if (!metadata) {
      return false;
    }

    const { socket } = metadata;
    if (socket) {
      // 移除所有监听器（防止内存泄漏）
      socket.removeAllListeners();

      // 销毁连接
      if (!socket.destroyed) {
        socket.destroy();
      }
    }

    this.sockets.delete(deviceId);
    this.removeFromAccessOrder(deviceId);

    console.log(`SocketConnectionManager: 已关闭设备 ${deviceId} 的连接`);
    return true;
  }

  /**
   * 关闭所有连接
   */
  closeAll() {
    console.log(`SocketConnectionManager: 正在关闭所有连接 (共 ${this.sockets.size} 个)`);

    for (const deviceId of this.sockets.keys()) {
      this.closeConnection(deviceId);
    }

    console.log('SocketConnectionManager: 所有连接已关闭');
  }

  /**
   * 清理空闲连接
   * @private
   */
  cleanupIdleConnections() {
    const now = Date.now();
    const expiredConnections = [];

    for (const [deviceId, metadata] of this.sockets.entries()) {
      const idleTime = now - metadata.lastActivity;

      // 如果空闲时间超过阈值
      if (idleTime > this.idleTimeout) {
        expiredConnections.push(deviceId);
      }

      // 如果 socket 已经失效
      if (metadata.socket && metadata.socket.destroyed) {
        expiredConnections.push(deviceId);
      }
    }

    // 关闭过期连接
    for (const deviceId of expiredConnections) {
      console.log(`SocketConnectionManager: 清理空闲连接: ${deviceId}`);
      this.closeConnection(deviceId);
    }

    if (expiredConnections.length > 0) {
      console.log(`SocketConnectionManager: 已清理 ${expiredConnections.length} 个空闲连接`);
    }
  }

  /**
   * 心跳检测
   * @private
   */
  performHeartbeat() {
    for (const [deviceId, metadata] of this.sockets.entries()) {
      const { socket, isAlive } = metadata;

      // 如果上次心跳未响应，关闭连接
      if (!isAlive) {
        console.warn(`SocketConnectionManager: 设备 ${deviceId} 心跳检测失败，关闭连接`);
        this.closeConnection(deviceId);
        continue;
      }

      // 标记为未响应，等待下次数据接收
      metadata.isAlive = false;

      // 发送心跳包（空数据）- 根据协议可能需要自定义
      if (socket && socket.writable) {
        try {
          socket.write('\n'); // 简单的心跳包
          metadata.bytesSent += 1;
        } catch (error) {
          console.error(`SocketConnectionManager: 发送心跳包失败: ${deviceId}`, error.message);
          this.closeConnection(deviceId);
        }
      }
    }
  }

  /**
   * 更新访问顺序（LRU）
   * @private
   */
  updateAccessOrder(deviceId) {
    const index = this.accessOrder.indexOf(deviceId);
    if (index !== -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(deviceId);
  }

  /**
   * 从访问顺序中移除
   * @private
   */
  removeFromAccessOrder(deviceId) {
    const index = this.accessOrder.indexOf(deviceId);
    if (index !== -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  /**
   * 获取连接统计信息
   *
   * @returns {Object} 统计信息
   */
  getStats() {
    const stats = {
      totalConnections: this.sockets.size,
      connections: []
    };

    for (const [deviceId, metadata] of this.sockets.entries()) {
      stats.connections.push({
        deviceId,
        host: metadata.host,
        port: metadata.port,
        connectedAt: metadata.connectedAt,
        lastActivity: metadata.lastActivity,
        idleTime: Date.now() - metadata.lastActivity,
        bytesReceived: metadata.bytesReceived,
        bytesSent: metadata.bytesSent,
        isAlive: metadata.isAlive
      });
    }

    return stats;
  }

  /**
   * 销毁管理器，清理所有资源
   */
  destroy() {
    console.log('SocketConnectionManager: 正在销毁...');

    // 清理定时器
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    if (this.heartbeatTask) {
      clearInterval(this.heartbeatTask);
      this.heartbeatTask = null;
    }

    // 关闭所有连接
    this.closeAll();

    // 清空访问顺序
    this.accessOrder = [];

    console.log('SocketConnectionManager: 已销毁');
  }
}

module.exports = SocketConnectionManager;
