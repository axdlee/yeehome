const EventEmitter = require('events');
const YeelightCloudService = require('./YeelightCloudService');

class CloudDeviceManager extends EventEmitter {
  constructor() {
    super();
    // 使用单例模式获取云服务实例
    this.cloudService = YeelightCloudService.getInstance();
    this.devices = new Map(); // 存储云端设备，key为deviceId
    this.lastSyncTime = null;
    
    // 监听云服务事件
    this.cloudService.on('authenticated', () => {
      console.log('CloudDeviceManager: 已认证，开始同步设备');
      this.syncDevices();
    });
    
    this.cloudService.on('authError', (error) => {
      console.error('CloudDeviceManager: 认证错误:', error);
      this.emit('authError', error);
    });
    
    this.cloudService.on('logout', () => {
      console.log('CloudDeviceManager: 已登出，清空设备列表');
      this.devices.clear();
      this.emit('devicesCleared');
    });
  }
  
  /**
   * 设置API基础URL
   * @param {string} url - API基础URL
   */
  setApiBaseUrl(url) {
    this.cloudService.setApiBaseUrl(url);
  }
  
  /**
   * 设置OAuth配置
   * @param {Object} config - OAuth配置
   */
  setOAuthConfig(config) {
    this.cloudService.setOAuthConfig(config);
  }
  
  /**
   * 获取授权URL
   * @param {string} state - 随机字符串，用于防止CSRF攻击
   * @returns {string} 授权URL
   */
  getAuthorizationUrl(state) {
    return this.cloudService.getAuthorizationUrl(state);
  }
  
  /**
   * 使用授权码换取访问令牌
   * @param {string} code - 授权码
   * @returns {Promise<Object>} 包含access_token和refresh_token的对象
   */
  async getAccessToken(code) {
    return this.cloudService.getAccessToken(code);
  }
  
  /**
   * 检查是否已认证
   * @returns {boolean} 是否已认证
   */
  isAuthenticated() {
    return this.cloudService.isAuthenticated();
  }
  
  /**
   * 获取当前认证状态
   * @returns {Object} 当前认证状态
   */
  getAuthStatus() {
    return this.cloudService.getAuthStatus();
  }
  
  /**
   * 登出
   */
  logout() {
    this.cloudService.logout();
  }
  
  /**
   * 同步设备列表
   * @returns {Promise<Array>} 同步后的设备列表
   */
  async syncDevices() {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }
    
    try {
      console.log('开始同步云端设备...');
      const response = await this.cloudService.discoverDevices();
      const devices = this.cloudService.parseDevicesResponse(response);
      
      // 更新设备列表
      this.devices.clear();
      devices.forEach(device => {
        // 为设备添加云端标识
        device.source = 'cloud';
        this.devices.set(device.id, device);
      });
      
      this.lastSyncTime = Date.now();
      
      console.log(`云端设备同步完成，共发现 ${devices.length} 个设备`);
      this.emit('devicesSynced', Array.from(this.devices.values()));
      
      return Array.from(this.devices.values());
    } catch (error) {
      console.error('同步云端设备失败:', error);
      this.emit('syncError', error);
      throw error;
    }
  }
  
  /**
   * 获取所有云端设备
   * @returns {Array} 设备列表
   */
  getDevices() {
    return Array.from(this.devices.values());
  }
  
  /**
   * 根据ID获取设备
   * @param {string} deviceId - 设备ID
   * @returns {Object|null} 设备信息
   */
  getDevice(deviceId) {
    return this.devices.get(deviceId) || null;
  }
  
  /**
   * 查询设备状态
   * @param {Array|string} deviceIds - 设备ID列表或单个设备ID
   * @returns {Promise<Object>} 设备状态
   */
  async queryDevices(deviceIds) {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }
    
    if (!deviceIds || deviceIds.length === 0) {
      return {};
    }
    
    try {
      // 确保deviceIds是数组
      const ids = Array.isArray(deviceIds) ? deviceIds : [deviceIds];
      
      // 构建查询请求的设备列表
      const devicesToQuery = ids.map(id => {
        const device = this.getDevice(id);
        return device ? {
          id: device.id,
          customData: device.customData
        } : null;
      }).filter(Boolean);
      
      if (devicesToQuery.length === 0) {
        return {};
      }
      
      const response = await this.cloudService.queryDevices(devicesToQuery);
      const deviceStates = this.cloudService.parseQueryResponse(response);
      
      // 更新本地设备状态
      Object.keys(deviceStates).forEach(deviceId => {
        const device = this.getDevice(deviceId);
        if (device) {
          // 更新设备状态
          this.updateDeviceState(device, deviceStates[deviceId]);
        }
      });
      
      return deviceStates;
    } catch (error) {
      console.error('查询设备状态失败:', error);
      throw error;
    }
  }
  
  /**
   * 控制设备
   * @param {string} deviceId - 设备ID
   * @param {Array} executions - 执行命令列表
   * @returns {Promise<Object>} 控制结果
   */
  async controlDevice(deviceId, executions) {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }
    
    const device = this.getDevice(deviceId);
    if (!device) {
      throw new Error(`设备 ${deviceId} 未找到`);
    }
    
    try {
      const command = this.cloudService.createControlCommand([
        {
          id: device.id,
          customData: device.customData
        }
      ], executions);
      
      const response = await this.cloudService.controlDevices([command]);
      const result = this.cloudService.parseControlResponse(response);
      
      if (result.success && result.commands && result.commands.length > 0) {
        const commandResult = result.commands[0];
        if (commandResult.ids.includes(deviceId) && commandResult.states) {
          // 更新设备状态
          this.updateDeviceState(device, commandResult.states);
        }
      }
      
      return result;
    } catch (error) {
      console.error(`控制设备 ${deviceId} 失败:`, error);
      throw error;
    }
  }
  
  /**
   * 更新设备状态
   * @param {Object} device - 设备对象
   * @param {Object} states - 新的设备状态
   */
  updateDeviceState(device, states) {
    // 更新设备状态
    Object.assign(device, states);
    
    // 触发设备状态更新事件
    this.emit('deviceUpdated', device);
  }
  
  /**
   * 控制设备电源
   * @param {string} deviceId - 设备ID
   * @param {boolean} power - 电源状态（true: 开, false: 关）
   * @returns {Promise<Object>} 控制结果
   */
  async togglePower(deviceId, power) {
    const executions = [
      {
        command: 'action.devices.commands.OnOff',
        params: {
          on: power
        }
      }
    ];
    
    return this.controlDevice(deviceId, executions);
  }
  
  /**
   * 设置设备亮度
   * @param {string} deviceId - 设备ID
   * @param {number} brightness - 亮度值（1-100）
   * @returns {Promise<Object>} 控制结果
   */
  async setBrightness(deviceId, brightness) {
    const executions = [
      {
        command: 'action.devices.commands.BrightnessAbsolute',
        params: {
          brightness: brightness
        }
      }
    ];
    
    return this.controlDevice(deviceId, executions);
  }
  
  /**
   * 增加设备亮度
   * @param {string} deviceId - 设备ID
   * @returns {Promise<Object>} 控制结果
   */
  async increaseBrightness(deviceId) {
    const executions = [
      {
        command: 'action.devices.commands.BrightnessIncrement',
        params: {}
      }
    ];
    
    return this.controlDevice(deviceId, executions);
  }
  
  /**
   * 降低设备亮度
   * @param {string} deviceId - 设备ID
   * @returns {Promise<Object>} 控制结果
   */
  async decreaseBrightness(deviceId) {
    const executions = [
      {
        command: 'action.devices.commands.BrightnessDecrement',
        params: {}
      }
    ];
    
    return this.controlDevice(deviceId, executions);
  }
  
  /**
   * 设置设备色温
   * @param {string} deviceId - 设备ID
   * @param {number} temperature - 色温值（2700-6500K）
   * @returns {Promise<Object>} 控制结果
   */
  async setColorTemperature(deviceId, temperature) {
    const executions = [
      {
        command: 'action.devices.commands.ColorAbsolute',
        params: {
          color: {
            temperature: temperature
          }
        }
      }
    ];
    
    return this.controlDevice(deviceId, executions);
  }
  
  /**
   * 设置设备颜色
   * @param {string} deviceId - 设备ID
   * @param {number} rgb - RGB颜色值（0-16777215）
   * @returns {Promise<Object>} 控制结果
   */
  async setColor(deviceId, rgb) {
    const executions = [
      {
        command: 'action.devices.commands.ColorAbsolute',
        params: {
          color: {
            spectrumRGB: rgb
          }
        }
      }
    ];
    
    return this.controlDevice(deviceId, executions);
  }
  
  /**
   * 设置窗帘开合度
   * @param {string} deviceId - 设备ID
   * @param {number} openPercent - 开合度（0-100）
   * @returns {Promise<Object>} 控制结果
   */
  async setOpenClose(deviceId, openPercent) {
    const executions = [
      {
        command: 'action.devices.commands.OpenClose',
        params: {
          openPercent: openPercent
        }
      }
    ];
    
    return this.controlDevice(deviceId, executions);
  }
  
  /**
   * 设置风扇风速
   * @param {string} deviceId - 设备ID
   * @param {number} fanSpeed - 风速（0, 1, 2）
   * @returns {Promise<Object>} 控制结果
   */
  async setFanSpeed(deviceId, fanSpeed) {
    const executions = [
      {
        command: 'action.devices.commands.FanSpeed',
        params: {
          fanSpeed: fanSpeed
        }
      }
    ];
    
    return this.controlDevice(deviceId, executions);
  }
  
  /**
   * 获取设备支持的特性
   * @param {string} deviceId - 设备ID
   * @returns {Array} 设备支持的特性列表
   */
  getDeviceTraits(deviceId) {
    const device = this.getDevice(deviceId);
    return device ? device.traits || [] : [];
  }
  
  /**
   * 检查设备是否支持某个特性
   * @param {string} deviceId - 设备ID
   * @param {string} trait - 特性名称
   * @returns {boolean} 是否支持该特性
   */
  hasDeviceTrait(deviceId, trait) {
    const traits = this.getDeviceTraits(deviceId);
    return traits.includes(trait);
  }
  
  /**
   * 按设备类型过滤设备
   * @param {string} type - 设备类型
   * @returns {Array} 过滤后的设备列表
   */
  getDevicesByType(type) {
    return this.getDevices().filter(device => device.type === type);
  }
  
  /**
   * 获取设备的最后同步时间
   * @returns {Date|null} 最后同步时间
   */
  getLastSyncTime() {
    return this.lastSyncTime;
  }
  
  /**
   * 检查设备是否在线
   * @param {string} deviceId - 设备ID
   * @returns {boolean} 设备是否在线
   */
  isDeviceOnline(deviceId) {
    const device = this.getDevice(deviceId);
    return device ? device.online !== false : false;
  }
}

module.exports = CloudDeviceManager;
