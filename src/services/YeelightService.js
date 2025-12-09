const dgram = require('dgram');
const net = require('net');
const EventEmitter = require('events');

class YeelightService extends EventEmitter {
  constructor() {
    super();
    this.devices = [];
    this.discoverer = null;
    this.searchSocket = null;
    this.deviceSockets = new Map(); // 存储设备的TCP连接
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
      this.searchSocket.setTTL(1);
      
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
      this.searchSocket.send(searchBuffer, 1982, '239.255.255.250');
      console.log('第一次发送SSDP搜索请求:', searchMessage);
      
      // 第二次发送（1秒后）
      setTimeout(() => {
        this.searchSocket.send(searchBuffer, 1982, '239.255.255.250');
        console.log('第二次发送SSDP搜索请求');
      }, 1000);
      
      // 第三次发送（2秒后）
      setTimeout(() => {
        this.searchSocket.send(searchBuffer, 1982, '239.255.255.250');
        console.log('第三次发送SSDP搜索请求');
      }, 2000);
    });
    
    // 5秒后停止搜索
    setTimeout(() => {
      this.stopDiscover();
      console.log(`设备发现完成，共发现 ${this.devices.length} 个设备`);
      this.emit('discoverDone', this.devices);
    }, 5000);
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
    const socket = net.createConnection({ host: device.host, port: device.port }, () => {
      console.log(`已连接到设备 ${device.id} (${device.host}:${device.port})`);
      this.deviceSockets.set(device.id, socket);
      
      // 请求设备状态
      this.getDeviceStatus(device);
    });
    
    socket.on('data', (data) => {
      this.handleDeviceResponse(device, data);
    });
    
    socket.on('error', (error) => {
      console.error(`设备 ${device.id} 连接错误:`, error);
      this.deviceSockets.delete(device.id);
    });
    
    socket.on('close', () => {
      console.log(`设备 ${device.id} 连接已关闭`);
      this.deviceSockets.delete(device.id);
    });
  }

  /**
   * 获取设备状态
   * @param {Object} device - 设备信息
   */
  getDeviceStatus(device) {
    const socket = this.deviceSockets.get(device.id);
    if (!socket) {
      console.error(`设备 ${device.id} 未连接`);
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
    const socket = this.deviceSockets.get(deviceId);
    if (!socket) {
      console.error(`设备 ${deviceId} 未连接`);
      return;
    }
    
    const commandString = JSON.stringify(command) + '\r\n';
    console.log(`向设备 ${deviceId} 发送命令:`, commandString);
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
            props[paramName] = parseInt(paramValue);
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
   * 控制设备电源
   * @param {string} deviceId - 设备ID
   * @param {boolean} power - 电源状态（true: 开, false: 关）
   */
  togglePower(deviceId, power) {
    const device = this.devices.find(d => d.id === deviceId);
    if (!device) {
      console.error(`设备 ${deviceId} 未找到`);
      return false;
    }
    
    const powerStr = power ? 'on' : 'off';
    
    // 检查设备是否连接，如果未连接则尝试重新连接
    if (!this.deviceSockets.has(deviceId)) {
      console.log(`设备 ${deviceId} 未连接，尝试重新连接...`);
      this.connectDevice(device);
      // 短暂延迟，确保连接建立
      setTimeout(() => {
        const command = {
          id: Date.now(),
          method: 'set_power',
          params: [powerStr, 'smooth', 500]
        };
        this.sendCommand(deviceId, command);
      }, 500);
    } else {
      // 设备已连接，直接发送命令
      const command = {
        id: Date.now(),
        method: 'set_power',
        params: [powerStr, 'smooth', 500]
      };
      this.sendCommand(deviceId, command);
    }
    return true;
  }

  /**
   * 设置设备亮度
   * @param {string} deviceId - 设备ID
   * @param {number} brightness - 亮度值（1-100）
   */
  setBrightness(deviceId, brightness) {
    const device = this.devices.find(d => d.id === deviceId);
    if (!device) {
      console.error(`设备 ${deviceId} 未找到`);
      return false;
    }
    
    // 确保亮度在有效范围内
    brightness = Math.max(1, Math.min(100, brightness));
    
    // 检查设备是否连接，如果未连接则尝试重新连接
    if (!this.deviceSockets.has(deviceId)) {
      console.log(`设备 ${deviceId} 未连接，尝试重新连接...`);
      this.connectDevice(device);
      // 短暂延迟，确保连接建立
      setTimeout(() => {
        const command = {
          id: Date.now(),
          method: 'set_bright',
          params: [brightness, 'smooth', 500]
        };
        this.sendCommand(deviceId, command);
      }, 500);
    } else {
      // 设备已连接，直接发送命令
      const command = {
        id: Date.now(),
        method: 'set_bright',
        params: [brightness, 'smooth', 500]
      };
      this.sendCommand(deviceId, command);
    }
    return true;
  }

  /**
   * 设置设备色温
   * @param {string} deviceId - 设备ID
   * @param {number} colorTemperature - 色温值（1700-6500K）
   */
  setColorTemperature(deviceId, colorTemperature) {
    const device = this.devices.find(d => d.id === deviceId);
    if (!device) {
      console.error(`设备 ${deviceId} 未找到`);
      return false;
    }
    
    // 确保色温在有效范围内
    colorTemperature = Math.max(1700, Math.min(6500, colorTemperature));
    
    // 检查设备是否连接，如果未连接则尝试重新连接
    if (!this.deviceSockets.has(deviceId)) {
      console.log(`设备 ${deviceId} 未连接，尝试重新连接...`);
      this.connectDevice(device);
      // 短暂延迟，确保连接建立
      setTimeout(() => {
        const command = {
          id: Date.now(),
          method: 'set_ct_abx',
          params: [colorTemperature, 'smooth', 500]
        };
        this.sendCommand(deviceId, command);
      }, 500);
    } else {
      // 设备已连接，直接发送命令
      const command = {
        id: Date.now(),
        method: 'set_ct_abx',
        params: [colorTemperature, 'smooth', 500]
      };
      this.sendCommand(deviceId, command);
    }
    return true;
  }

  /**
   * 设置设备颜色
   * @param {string} deviceId - 设备ID
   * @param {number} rgb - RGB颜色值（0-16777215）
   */
  setColor(deviceId, rgb) {
    const device = this.devices.find(d => d.id === deviceId);
    if (!device) {
      console.error(`设备 ${deviceId} 未找到`);
      return false;
    }
    
    // 确保RGB值在有效范围内
    rgb = Math.max(0, Math.min(16777215, rgb));
    
    // 检查设备是否连接，如果未连接则尝试重新连接
    if (!this.deviceSockets.has(deviceId)) {
      console.log(`设备 ${deviceId} 未连接，尝试重新连接...`);
      this.connectDevice(device);
      // 短暂延迟，确保连接建立
      setTimeout(() => {
        const command = {
          id: Date.now(),
          method: 'set_rgb',
          params: [rgb, 'smooth', 500]
        };
        this.sendCommand(deviceId, command);
      }, 500);
    } else {
      // 设备已连接，直接发送命令
      const command = {
        id: Date.now(),
        method: 'set_rgb',
        params: [rgb, 'smooth', 500]
      };
      this.sendCommand(deviceId, command);
    }
    return true;
  }
  
  /**
   * 切换设备电源状态
   * @param {string} deviceId - 设备ID
   */
  toggle(deviceId) {
    const device = this.devices.find(d => d.id === deviceId);
    if (!device) {
      console.error(`设备 ${deviceId} 未找到`);
      return false;
    }
    
    // 检查设备是否连接，如果未连接则尝试重新连接
    if (!this.deviceSockets.has(deviceId)) {
      console.log(`设备 ${deviceId} 未连接，尝试重新连接...`);
      this.connectDevice(device);
      // 短暂延迟，确保连接建立
      setTimeout(() => {
        const command = {
          id: Date.now(),
          method: 'toggle',
          params: []
        };
        this.sendCommand(deviceId, command);
      }, 500);
    } else {
      // 设备已连接，直接发送命令
      const command = {
        id: Date.now(),
        method: 'toggle',
        params: []
      };
      this.sendCommand(deviceId, command);
    }
    return true;
  }
  
  /**
   * 设置设备情景
   * @param {string} deviceId - 设备ID
   * @param {string} sceneType - 情景类型（color, hsv, ct, auto_delay_off）
   * @param {Array} params - 情景参数
   */
  setScene(deviceId, sceneType, params) {
    const device = this.devices.find(d => d.id === deviceId);
    if (!device) {
      console.error(`设备 ${deviceId} 未找到`);
      return false;
    }
    
    // 检查设备是否连接，如果未连接则尝试重新连接
    if (!this.deviceSockets.has(deviceId)) {
      console.log(`设备 ${deviceId} 未连接，尝试重新连接...`);
      this.connectDevice(device);
      // 短暂延迟，确保连接建立
      setTimeout(() => {
        const command = {
          id: Date.now(),
          method: 'set_scene',
          params: [sceneType, ...params]
        };
        this.sendCommand(deviceId, command);
      }, 500);
    } else {
      // 设备已连接，直接发送命令
      const command = {
        id: Date.now(),
        method: 'set_scene',
        params: [sceneType, ...params]
      };
      this.sendCommand(deviceId, command);
    }
    return true;
  }

  /**
   * 设置设备默认状态
   * @param {string} deviceId - 设备ID
   */
  setDefault(deviceId) {
    const device = this.devices.find(d => d.id === deviceId);
    if (!device) {
      console.error(`设备 ${deviceId} 未找到`);
      return false;
    }
    
    // 检查设备是否连接，如果未连接则尝试重新连接
    if (!this.deviceSockets.has(deviceId)) {
      console.log(`设备 ${deviceId} 未连接，尝试重新连接...`);
      this.connectDevice(device);
      // 短暂延迟，确保连接建立
      setTimeout(() => {
        const command = {
          id: Date.now(),
          method: 'set_default',
          params: []
        };
        this.sendCommand(deviceId, command);
      }, 500);
    } else {
      // 设备已连接，直接发送命令
      const command = {
        id: Date.now(),
        method: 'set_default',
        params: []
      };
      this.sendCommand(deviceId, command);
    }
    return true;
  }

  /**
   * 清理资源，关闭所有设备连接
   */
  cleanup() {
    console.log('清理Yeelight服务资源...');
    
    // 关闭所有设备连接
    for (const [deviceId, socket] of this.deviceSockets.entries()) {
      try {
        console.log(`关闭设备 ${deviceId} 连接`);
        socket.end();
        socket.destroy();
      } catch (error) {
        console.error(`关闭设备 ${deviceId} 连接失败:`, error);
      }
    }
    
    // 清空设备套接字映射
    this.deviceSockets.clear();
    
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
    
    // 关闭所有设备连接
    for (const [deviceId, socket] of this.deviceSockets.entries()) {
      socket.end();
      socket.destroy();
    }
    this.deviceSockets.clear();
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
    const socket = this.deviceSockets.get(deviceId);
    if (!socket) {
      console.error(`设备 ${deviceId} 未连接`);
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
    const socket = this.deviceSockets.get(deviceId);
    if (!socket) {
      console.error(`设备 ${deviceId} 未连接`);
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