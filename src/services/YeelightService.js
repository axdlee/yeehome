const dgram = require('dgram');
const net = require('net');
const EventEmitter = require('events');
const SocketConnectionManager = require('./network/SocketConnectionManager');

// 常量定义
const SSDP_TTL = 1;
const SSDP_PORT = 1982;
const SSDP_MULTICAST_ADDRESS = '239.255.255.250';
const SSDP_SEARCH_DELAY1 = 1000;
const SSDP_SEARCH_DELAY2 = 2000;
const SSDP_SEARCH_TIMEOUT = 5000;
const DEVICE_CONNECT_DELAY = 500;
const BRIGHTNESS_MIN = 1;
const BRIGHTNESS_MAX = 100;
const COLOR_TEMP_MIN = 1700;
const COLOR_TEMP_MAX = 6500;
const RGB_MIN = 0;
const RGB_MAX = 16777215;

class YeelightService extends EventEmitter {
  constructor() {
    super();
    this.devices = [];
    this.discoverer = null;
    this.searchSocket = null;

    // 使用 SocketConnectionManager 管理设备连接
    this.connectionManager = new SocketConnectionManager({
      timeout: 30000,       // 30秒连接超时
      maxConnections: 100,  // 最多100个连接
      idleTimeout: 300000   // 5分钟空闲超时
    });

    // 监听连接管理器事件
    this.connectionManager.on('data', (deviceId, data) => {
      const device = this.devices.find(d => d.id === deviceId);
      if (device) {
        this.handleDeviceResponse(device, data);
      }
    });

    this.connectionManager.on('error', (deviceId, error) => {
      console.error(`YeelightService: 设备 ${deviceId} 连接错误:`, error.message);
    });

    this.connectionManager.on('disconnected', (deviceId) => {
      console.log(`YeelightService: 设备 ${deviceId} 连接已断开`);
      this.emit('deviceDisconnected', deviceId);
    });
  }

  /**
   * 发现Yeelight设备（基于SSDP协议）
   * 参考：Yeelight WiFi Light Inter-Operation Specification
   */
  discoverDevices() {
    console.log('开始发现Yeelight设备...');
    this.devices = [];
    
    // 创建UDP socket用于SSDP搜索，允许地址复用
    this.searchSocket = dgram.createSocket({
      type: 'udp4',
      reuseAddr: true
    });
    
    // 绑定socket事件
    this.searchSocket.on('listening', () => {
      const address = this.searchSocket.address();
      console.log(`SSDP搜索socket已启动，监听地址: ${address.address}:${address.port}`);
      
      // 设置TTL，确保多播消息可以在局域网中传播
      this.searchSocket.setTTL(SSDP_TTL);
      
      // 设置广播权限
      this.searchSocket.setBroadcast(true);
    });
    
    this.searchSocket.on('message', (message, remote) => {
      console.log(`收到来自 ${remote.address}:${remote.port} 的SSDP响应`);
      console.log('响应内容:', message.toString());
      this.handleSSDPResponse(message, remote);
    });
    
    this.searchSocket.on('error', (error) => {
      console.error('SSDP搜索错误:', error);
      this.searchSocket.close();
    });
    
    // 发送SSDP搜索请求
    const searchMessage = [
      'M-SEARCH * HTTP/1.1',
      'HOST: 239.255.255.250:1982',
      'MAN: "ssdp:discover"',
      'ST: wifi_bulb',
      'MX: 3',
      ''
    ].join('\r\n');
    
    const searchBuffer = Buffer.from(searchMessage);
    
    // 绑定socket后发送搜索请求
    this.searchSocket.bind(() => {
      // 第一次发送
      this.searchSocket.send(searchBuffer, SSDP_PORT, SSDP_MULTICAST_ADDRESS);
      console.log('第一次发送SSDP搜索请求:', searchMessage);
      
      // 第二次发送（1秒后）
      setTimeout(() => {
        this.searchSocket.send(searchBuffer, SSDP_PORT, SSDP_MULTICAST_ADDRESS);
        console.log('第二次发送SSDP搜索请求');
      }, SSDP_SEARCH_DELAY1);
      
      // 第三次发送（2秒后）
      setTimeout(() => {
        this.searchSocket.send(searchBuffer, SSDP_PORT, SSDP_MULTICAST_ADDRESS);
        console.log('第三次发送SSDP搜索请求');
      }, SSDP_SEARCH_DELAY2);
    });
    
    // 5秒后停止搜索
    setTimeout(() => {
      this.stopDiscover();
      console.log(`设备发现完成，共发现 ${this.devices.length} 个设备`);
      this.emit('discoverDone', this.devices);
    }, SSDP_SEARCH_TIMEOUT);
  }

  /**
   * 处理SSDP响应
   * @param {Buffer} message - SSDP响应消息
   * @param {Object} remote - 远程设备信息
   */
  handleSSDPResponse(message, remote) {
    const response = message.toString();
    console.log('收到SSDP响应:', response);
    
    // 解析响应头
    const headers = this.parseSSDPHeaders(response);
    if (!headers['Location']) {
      console.log('响应中没有Location头，跳过');
      return;
    }
    
    // 解析设备信息
    const deviceInfo = this.parseDeviceInfo(headers, response);
    if (!deviceInfo) {
      console.log('解析设备信息失败，跳过');
      return;
    }
    
    // 检查设备是否已存在
    const existingDevice = this.devices.find(d => d.id === deviceInfo.id);
    if (!existingDevice) {
      // 添加设备
      this.devices.push(deviceInfo);
      this.emit('deviceAdded', deviceInfo);
      console.log('设备添加成功:', deviceInfo);
      
      // 尝试连接设备获取更多状态信息
      this.connectDevice(deviceInfo);
    }
  }

  /**
   * 解析SSDP响应头
   * @param {string} response - SSDP响应字符串
   * @returns {Object} 解析后的响应头
   */
  parseSSDPHeaders(response) {
    const headers = {};
    const lines = response.split('\r\n');
    
    // 跳过第一行（状态行）
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) continue;
      
      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();
      headers[key] = value;
    }
    
    return headers;
  }

  /**
   * 解析设备信息
   * @param {Object} headers - SSDP响应头
   * @param {string} response - 完整SSDP响应
   * @returns {Object} 设备信息对象
   */
  parseDeviceInfo(headers, response) {
    try {
      // 解析Location URL获取IP和端口
      const location = headers['Location'];
      const url = new URL(location);
      const host = url.hostname;
      const port = parseInt(url.port) || 55443;
      
      // 从SSDP响应中提取设备ID（易来设备ID格式：id头中的十六进制字符串）
      let id = headers['id'];
      
      if (!id) {
        // 如果没有设备ID，使用host:port作为临时ID
        id = `${host}:${port}`;
      }
      
      // 安全地解析数值字段，处理空字符串情况
      const parseNumber = (value, defaultValue) => {
        if (value === undefined || value === null || value === '') {
          return defaultValue;
        }
        const parsed = parseInt(value);
        return isNaN(parsed) ? defaultValue : parsed;
      };
      
      // 解析设备状态信息
      // 注意：易来设备的SSDP响应中可能不包含所有状态信息
      // 需要后续通过TCP连接获取完整状态
      return {
        id: id,
        name: headers['name'] || 'Yeelight设备',
        model: headers['model'] || '',
        host: host,
        port: port,
        firmware_version: headers['fw_ver'] || '',
        support: headers['support'] ? headers['support'].split(/\s+/) : [],
        power: headers['power'] || 'off',
        bright: parseNumber(headers['bright'], 50),
        color_mode: parseNumber(headers['color_mode'], 2),
        ct: parseNumber(headers['ct'], 4000),
        rgb: parseNumber(headers['rgb'], 0),
        hue: parseNumber(headers['hue'], 0),
        sat: parseNumber(headers['sat'], 0),
        flowing: headers['flowing'] === '1',
        flow_params: headers['flow_params'] || '',
        music_on: headers['music_on'] === '1',
        active_mode: parseNumber(headers['active_mode'], 0),
        location: location,
        // 新增字段：记录设备类型
        device_type: headers['model'] ? (headers['model'].toLowerCase().includes('pro') ? 'pro' : 'standard') : 'standard'
      };
    } catch (error) {
      console.error('解析设备信息错误:', error);
      return null;
    }
  }

  /**
   * 连接到Yeelight设备
   * @param {Object} device - 设备信息
   */
  connectDevice(device) {
    // 使用 SocketConnectionManager 创建连接
    const socket = this.connectionManager.createConnection(device.id, device.host, device.port);

    // 连接成功后请求设备状态
    if (socket) {
      console.log(`YeelightService: 准备获取设备 ${device.id} 的状态`);
      // 稍微延迟以确保连接完全建立
      setTimeout(() => {
        this.getDeviceStatus(device);
      }, 500);
    }
  }

  /**
   * 获取设备状态
   * @param {Object} device - 设备信息
   */
  getDeviceStatus(device) {
    const socket = this.connectionManager.getSocket(device.id);
    if (!socket) {
      console.error(`YeelightService: 设备 ${device.id} 未连接`);
      return;
    }

    // 发送状态查询命令，根据易来官方文档，支持的属性包括：
    // power, bright, ct, rgb, hue, sat, color_mode, flowing, flow_params, music_on, name, active_mode
    const command = {
      id: Date.now(),
      method: 'get_prop',
      params: ['power', 'bright', 'ct', 'rgb', 'hue', 'sat', 'color_mode', 'flowing', 'flow_params', 'music_on', 'name', 'active_mode']
    };

    this.sendCommand(device.id, command);
  }

  /**
   * 向设备发送命令
   * @param {string} deviceId - 设备ID
   * @param {Object} command - 命令对象
   */
  sendCommand(deviceId, command) {
    const socket = this.connectionManager.getSocket(deviceId);
    if (!socket) {
      console.error(`YeelightService: 设备 ${deviceId} 未连接`);
      return;
    }

    const commandString = JSON.stringify(command) + '\r\n';
    console.log(`YeelightService: 向设备 ${deviceId} 发送命令:`, commandString);
    socket.write(commandString);
  }

  /**
   * 处理设备响应
   * @param {Object} device - 设备信息
   * @param {Buffer} data - 响应数据
   */
  handleDeviceResponse(device, data) {
    const responseString = data.toString();
    console.log(`设备 ${device.id} 响应:`, responseString);
    
    // 解析响应（可能包含多个JSON对象）
    const responses = responseString.split('\r\n').filter(line => line.trim());
    for (const response of responses) {
      try {
        const responseObj = JSON.parse(response);
        
        // 处理属性通知（易来文档：设备状态变化时主动推送）
        if (responseObj.method === 'props') {
          this.updateDeviceState(device, responseObj.params);
        } 
        // 处理命令响应（易来文档：命令执行结果）
        else {
          // 检查是否是错误响应
          if (responseObj.error) {
            console.error(`设备 ${device.id} 错误响应:`, responseObj.error);
            this.emit('deviceError', device.id, responseObj.error);
            return;
          }
          
          console.log(`设备 ${device.id} 命令响应:`, responseObj);
          
          // 如果是get_prop命令的响应，更新设备状态
          if (responseObj.result && Array.isArray(responseObj.result)) {
            // 解析get_prop响应结果
            this.parseGetPropResponse(device, responseObj);
          }
          // 如果是get_scene命令的响应，处理情景列表
          else if (responseObj.id && responseObj.result && Array.isArray(responseObj.result)) {
            console.log(`设备 ${device.id} 情景列表:`, responseObj.result);
            // 发送情景列表事件
            this.emit('scenesReceived', device.id, responseObj.result);
          }
        }
      } catch (error) {
        console.error(`解析设备 ${device.id} 响应错误:`, error);
      }
    }
  }
  
  /**
   * 解析get_prop命令的响应结果
   * @param {Object} device - 设备信息
   * @param {Object} responseObj - 响应对象
   */
  parseGetPropResponse(device, responseObj) {
    // 根据易来官方文档，get_prop的result顺序与params顺序一致
    const params = ['power', 'bright', 'ct', 'rgb', 'hue', 'sat', 'color_mode', 'flowing', 'flow_params', 'music_on', 'name', 'active_mode'];
    const result = responseObj.result;
    
    if (params.length !== result.length) {
      console.error(`设备 ${device.id} get_prop响应参数数量不匹配`);
      return;
    }
    
    // 构建属性对象
    const props = {};
    for (let i = 0; i < params.length; i++) {
      const paramName = params[i];
      const paramValue = result[i];
      
      if (paramValue !== undefined && paramValue !== null) {
        // 根据参数类型转换值
        switch (paramName) {
          case 'power':
          case 'name':
          case 'flow_params':
            props[paramName] = paramValue;
            break;
          case 'bright':
          case 'ct':
          case 'rgb':
          case 'hue':
          case 'sat':
          case 'color_mode':
          case 'active_mode':
            // 处理空字符串情况,返回0作为默认值
            props[paramName] = paramValue === '' ? 0 : parseInt(paramValue) || 0;
            break;
          case 'flowing':
          case 'music_on':
            props[paramName] = paramValue === '1' || paramValue === 1;
            break;
        }
      }
    }
    
    // 更新设备状态
    this.updateDeviceState(device, props);
  }

  /**
   * 更新设备状态
   * @param {Object} device - 设备信息
   * @param {Object} props - 设备属性
   */
  updateDeviceState(device, props) {
    // 更新设备属性
    Object.assign(device, props);
    
    // 触发设备状态更新事件
    this.emit('deviceUpdated', device);
  }

  /**
   * 确保设备已连接并执行命令
   * @private
   * @param {string} deviceId - 设备ID
   * @param {Function} commandFn - 命令执行函数
   * @returns {Promise<boolean>}
   */
  async ensureConnectedAndExecute(deviceId, commandFn) {
    const device = this.devices.find(d => d.id === deviceId);
    if (!device) {
      console.error(`YeelightService: 设备 ${deviceId} 未找到`);
      return false;
    }

    // 检查是否已连接
    if (!this.connectionManager.hasConnection(deviceId)) {
      console.log(`YeelightService: 设备 ${deviceId} 未连接，尝试重新连接...`);
      this.connectDevice(device);
      // 等待连接建立
      await new Promise(resolve => setTimeout(resolve, DEVICE_CONNECT_DELAY));
    }

    // 执行命令
    try {
      commandFn();
      return true;
    } catch (error) {
      console.error(`YeelightService: 执行命令失败:`, error.message);
      return false;
    }
  }

  /**
   * 控制设备电源
   * @param {string} deviceId - 设备ID
   * @param {boolean} power - 电源状态（true: 开, false: 关）
   */
  async togglePower(deviceId, power) {
    const powerStr = power ? 'on' : 'off';
    const command = {
      id: Date.now(),
      method: 'set_power',
      params: [powerStr, 'smooth', 500]
    };

    return this.ensureConnectedAndExecute(deviceId, () => {
      this.sendCommand(deviceId, command);
    });
  }

  /**
   * 设置设备亮度
   * @param {string} deviceId - 设备ID
   * @param {number} brightness - 亮度值（1-100）
   */
  async setBrightness(deviceId, brightness) {
    // 确保亮度在有效范围内
    brightness = Math.max(BRIGHTNESS_MIN, Math.min(BRIGHTNESS_MAX, brightness));

    const command = {
      id: Date.now(),
      method: 'set_bright',
      params: [brightness, 'smooth', 500]
    };

    return this.ensureConnectedAndExecute(deviceId, () => {
      this.sendCommand(deviceId, command);
    });
  }

  /**
   * 设置设备色温
   * @param {string} deviceId - 设备ID
   * @param {number} colorTemperature - 色温值（1700-6500K）
   */
  async setColorTemperature(deviceId, colorTemperature) {
    // 确保色温在有效范围内
    colorTemperature = Math.max(COLOR_TEMP_MIN, Math.min(COLOR_TEMP_MAX, colorTemperature));

    const command = {
      id: Date.now(),
      method: 'set_ct_abx',
      params: [colorTemperature, 'smooth', 500]
    };

    return this.ensureConnectedAndExecute(deviceId, () => {
      this.sendCommand(deviceId, command);
    });
  }

  /**
   * 设置设备颜色（RGB）
   * @param {string} deviceId - 设备ID
   * @param {number} rgb - RGB值（0-16777215）
   */
  async setColor(deviceId, rgb) {
    // 确保RGB在有效范围内
    rgb = Math.max(RGB_MIN, Math.min(RGB_MAX, rgb));

    const command = {
      id: Date.now(),
      method: 'set_rgb',
      params: [rgb, 'smooth', 500]
    };

    return this.ensureConnectedAndExecute(deviceId, () => {
      this.sendCommand(deviceId, command);
    });
  }

  /**
   * 切换设备电源状态
   * @param {string} deviceId - 设备ID
   */
  async toggle(deviceId) {
    const command = {
      id: Date.now(),
      method: 'toggle',
      params: []
    };

    return this.ensureConnectedAndExecute(deviceId, () => {
      this.sendCommand(deviceId, command);
    });
  }

  /**
   * 设置设备情景
   * @param {string} deviceId - 设备ID
   * @param {string} sceneType - 情景类型（color, hsv, ct, auto_delay_off）
   * @param {Array} params - 情景参数
   */
  async setScene(deviceId, sceneType, params) {
    const command = {
      id: Date.now(),
      method: 'set_scene',
      params: [sceneType, ...params]
    };

    return this.ensureConnectedAndExecute(deviceId, () => {
      this.sendCommand(deviceId, command);
    });
  }

  /**
   * 设置设备默认状态
   * @param {string} deviceId - 设备ID
   */
  async setDefault(deviceId) {
    const command = {
      id: Date.now(),
      method: 'set_default',
      params: []
    };

    return this.ensureConnectedAndExecute(deviceId, () => {
      this.sendCommand(deviceId, command);
    });
  }

  /**
   * 清理资源，关闭所有设备连接
   */
  cleanup() {
    console.log('YeelightService: 清理资源...');

    // 使用 ConnectionManager 关闭所有连接
    this.connectionManager.destroy();

    // 停止SSDP搜索
    if (this.searchSocket) {
      try {
        console.log('关闭SSDP搜索套接字');
        this.searchSocket.close();
      } catch (error) {
        console.error('关闭SSDP搜索套接字失败:', error);
      }
    }
    
    console.log('Yeelight服务资源清理完成');
  }

  /**
   * 停止设备发现
   */
  stopDiscover() {
    if (this.searchSocket) {
      this.searchSocket.close();
      this.searchSocket = null;
      console.log('设备发现已停止');
    }
    
    // 通过连接管理器关闭所有设备连接
    if (this.connectionManager) {
      this.connectionManager.closeAll();
    }
  }

  /**
   * 获取所有设备
   * @returns {Array} 设备列表
   */
  getDevices() {
    return this.devices;
  }

  /**
   * 获取单个设备
   * @param {string} deviceId - 设备ID
   * @returns {Object|null} 设备信息
   */
  getDevice(deviceId) {
    return this.devices.find(d => d.id === deviceId) || null;
  }
  
  /**
   * 从设备读取情景列表
   * @param {string} deviceId - 设备ID
   */
  getScenesFromDevice(deviceId) {
    const socket = this.connectionManager.getSocket(deviceId);
    if (!socket) {
      console.error(`YeelightService: 设备 ${deviceId} 未连接`);
      return;
    }

    // 根据易来官方文档，支持的情景相关命令包括：
    // get_scene: 获取设备支持的情景列表
    // set_scene: 设置情景
    const command = {
      id: Date.now(),
      method: 'get_scene',
      params: []
    };

    this.sendCommand(deviceId, command);
  }

  /**
   * 从设备读取灯组列表
   * @param {string} deviceId - 设备ID
   */
  getGroupsFromDevice(deviceId) {
    // 根据易来官方文档，设备支持的组管理命令包括：
    // get_group: 获取设备所在的组
    // set_group: 设置设备的组
    // 注意：不同型号的设备可能支持不同的组管理命令
    const socket = this.connectionManager.getSocket(deviceId);
    if (!socket) {
      console.error(`YeelightService: 设备 ${deviceId} 未连接`);
      return;
    }

    const command = {
      id: Date.now(),
      method: 'get_group',
      params: []
    };

    this.sendCommand(deviceId, command);
  }
}

module.exports = YeelightService;