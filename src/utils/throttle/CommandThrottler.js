/**
 * 命令节流器
 * 防止用户快速操作时发送大量命令，优化设备响应稳定性
 *
 * @class CommandThrottler
 *
 * @example
 * const throttler = new CommandThrottler(100); // 最小间隔100ms
 *
 * throttler.throttle('device-123', command, (cmd) => {
 *   return sendCommand(cmd);
 * });
 */
class CommandThrottler {
  /**
   * @param {number} [minInterval=100] - 最小间隔（毫秒）
   * @param {Object} [options] - 可选配置
   * @param {boolean} [options.leading=true] - 是否在前缘执行
   * @param {boolean} [options.trailing=true] - 是否在后缘执行
   */
  constructor(minInterval = 100, options = {}) {
    this.minInterval = minInterval;
    this.leading = options.leading !== undefined ? options.leading : true;
    this.trailing = options.trailing !== undefined ? options.trailing : true;

    // 存储最后执行时间
    this.lastExecutionTime = new Map(); // deviceId -> timestamp

    // 存储待执行的命令
    this.pendingCommands = new Map(); // deviceId -> { timeout, command, executor, resolve, reject }

    // 统计信息
    this.stats = {
      executed: 0,
      throttled: 0,
      pending: 0
    };
  }

  /**
   * 节流执行命令
   *
   * @param {string} deviceId - 设备ID（节流的粒度）
   * @param {*} command - 命令数据
   * @param {Function} executor - 命令执行函数
   * @returns {Promise<*>} 执行结果
   *
   * @example
   * await throttler.throttle('device-123', { brightness: 80 }, async (cmd) => {
   *   return await deviceService.setBrightness(cmd);
   * });
   */
  throttle(deviceId, command, executor) {
    const now = Date.now();
    const lastTime = this.lastExecutionTime.get(deviceId) || 0;
    const timeSinceLastExecution = now - lastTime;

    // 如果距离上次执行已经超过最小间隔
    if (timeSinceLastExecution >= this.minInterval) {
      // 前缘执行
      if (this.leading) {
        this.lastExecutionTime.set(deviceId, now);
        this.stats.executed++;
        return this.executeCommand(executor, command);
      }
    }

    // 取消之前的待执行命令
    if (this.pendingCommands.has(deviceId)) {
      const pending = this.pendingCommands.get(deviceId);
      clearTimeout(pending.timeout);
      this.stats.throttled++;
    }

    // 后缘执行：延迟执行
    if (this.trailing) {
      return new Promise((resolve, reject) => {
        const delay = this.minInterval - timeSinceLastExecution;

        const timeout = setTimeout(() => {
          this.lastExecutionTime.set(deviceId, Date.now());
          this.pendingCommands.delete(deviceId);
          this.stats.executed++;

          this.executeCommand(executor, command)
            .then(resolve)
            .catch(reject);
        }, delay);

        this.pendingCommands.set(deviceId, {
          timeout,
          command,
          executor,
          resolve,
          reject
        });

        this.stats.pending++;
      });
    }

    // 如果既不 leading 也不 trailing，返回 rejected Promise
    return Promise.reject(new Error('Command throttled'));
  }

  /**
   * 执行命令
   * @private
   */
  async executeCommand(executor, command) {
    try {
      return await executor(command);
    } catch (error) {
      throw error;
    }
  }

  /**
   * 取消指定设备的待执行命令
   *
   * @param {string} deviceId - 设备ID
   * @returns {boolean} 是否有命令被取消
   */
  cancel(deviceId) {
    if (!this.pendingCommands.has(deviceId)) {
      return false;
    }

    const pending = this.pendingCommands.get(deviceId);
    clearTimeout(pending.timeout);
    this.pendingCommands.delete(deviceId);

    // 拒绝 Promise
    if (pending.reject) {
      pending.reject(new Error('Command cancelled'));
    }

    return true;
  }

  /**
   * 取消所有待执行命令
   *
   * @returns {number} 取消的命令数
   */
  cancelAll() {
    let count = 0;

    for (const [deviceId, pending] of this.pendingCommands.entries()) {
      clearTimeout(pending.timeout);
      if (pending.reject) {
        pending.reject(new Error('All commands cancelled'));
      }
      count++;
    }

    this.pendingCommands.clear();
    return count;
  }

  /**
   * 立即执行所有待执行命令
   *
   * @returns {number} 执行的命令数
   */
  flush() {
    let count = 0;

    for (const [deviceId, pending] of this.pendingCommands.entries()) {
      clearTimeout(pending.timeout);

      // 立即执行
      this.lastExecutionTime.set(deviceId, Date.now());
      this.executeCommand(pending.executor, pending.command)
        .then(pending.resolve)
        .catch(pending.reject);

      count++;
    }

    this.pendingCommands.clear();
    this.stats.executed += count;

    return count;
  }

  /**
   * 重置节流器
   *
   * @param {string} [deviceId] - 可选的设备ID，如果提供则只重置该设备
   */
  reset(deviceId = null) {
    if (deviceId) {
      this.lastExecutionTime.delete(deviceId);
      this.cancel(deviceId);
    } else {
      this.lastExecutionTime.clear();
      this.cancelAll();
    }
  }

  /**
   * 获取统计信息
   *
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      ...this.stats,
      pendingCount: this.pendingCommands.size,
      throttleRate: this.stats.throttled > 0
        ? ((this.stats.throttled / (this.stats.executed + this.stats.throttled)) * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  /**
   * 重置统计信息
   */
  resetStats() {
    this.stats = {
      executed: 0,
      throttled: 0,
      pending: 0
    };
  }

  /**
   * 销毁节流器
   */
  destroy() {
    // 取消所有待执行命令
    this.cancelAll();

    // 清空所有数据
    this.lastExecutionTime.clear();
    this.pendingCommands.clear();

    console.log('CommandThrottler: 已销毁');
  }
}

module.exports = CommandThrottler;
