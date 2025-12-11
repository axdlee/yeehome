const EventEmitter = require('events');
const YeelightCloudService = require('./YeelightCloudService');

class CloudSceneManager extends EventEmitter {
  constructor() {
    super();
    this.cloudService = new YeelightCloudService();
    this.scenes = new Map(); // 存储云端情景，key为sceneId
    this.lastSyncTime = null;
  }
  
  /**
   * 同步情景列表
   * @returns {Promise<void>}
   */
  async syncScenes() {
    if (!this.cloudService.isAuthenticated()) {
      throw new Error('CloudSceneManager: 未认证，无法同步情景');
    }
    
    try {
      // 目前Yeelight IoT开放平台的情景信息是通过设备列表返回的，设备中包含情景信息
      // 后续如果有单独的情景API，可以直接调用
      const response = await this.cloudService.discoverDevices();
      const devices = this.cloudService.parseDevicesResponse(response);
      
      // 从设备中提取情景信息
      const scenesMap = new Map();
      
      devices.forEach(device => {
        // 筛选出情景类型的设备
        if (device.type === 'action.devices.types.SCENE') {
          const scene = {
            id: device.id,
            name: device.name.deviceName || '未知情景',
            description: `云端情景 ${device.name.deviceName}`,
            devices: [device.id],
            source: 'cloud',
            sceneReversible: device.attributes.sceneReversible || false,
            customData: device.customData
          };
          
          scenesMap.set(device.id, scene);
        }
      });
      
      // 更新情景列表
      this.scenes = scenesMap;
      this.lastSyncTime = Date.now();
      
      console.log(`云端情景同步完成，共发现 ${this.scenes.size} 个情景`);
      this.emit('scenesSynced', Array.from(this.scenes.values()));
    } catch (error) {
      console.error('CloudSceneManager: 同步情景失败:', error);
      this.emit('syncError', error);
      throw error;
    }
  }
  
  /**
   * 获取所有情景
   * @returns {Array} 情景列表
   */
  getScenes() {
    return Array.from(this.scenes.values());
  }
  
  /**
   * 获取单个情景
   * @param {string} sceneId - 情景ID
   * @returns {Object|null} 情景信息或null
   */
  getScene(sceneId) {
    return this.scenes.get(sceneId) || null;
  }
  
  /**
   * 添加情景
   * @param {Object} scene - 情景对象
   */
  addScene(scene) {
    this.scenes.set(scene.id, scene);
    this.emit('sceneAdded', scene);
  }
  
  /**
   * 更新情景信息
   * @param {Object} scene - 更新后的情景信息
   */
  updateScene(scene) {
    this.scenes.set(scene.id, scene);
    this.emit('sceneUpdated', scene);
  }
  
  /**
   * 删除情景
   * @param {string} sceneId - 情景ID
   */
  deleteScene(sceneId) {
    this.scenes.delete(sceneId);
    this.emit('sceneDeleted', sceneId);
  }
  
  /**
   * 获取最后同步时间
   * @returns {Date|null} 最后同步时间
   */
  getLastSyncTime() {
    return this.lastSyncTime;
  }
  
  /**
   * 检查是否需要同步情景
   * @returns {boolean} 是否需要同步
   */
  shouldSyncScenes() {
    if (!this.cloudService.isAuthenticated()) {
      return false;
    }
    
    // 检查是否超过30分钟未同步
    const now = Date.now();
    return !this.lastSyncTime || (now - this.lastSyncTime > 30 * 60 * 1000);
  }
  
  /**
   * 执行情景
   * @param {string} sceneId - 情景ID
   * @returns {Promise<Object>} 执行结果
   */
  async executeScene(sceneId) {
    if (!this.cloudService.isAuthenticated()) {
      throw new Error('CloudSceneManager: 未认证，无法执行情景');
    }
    
    const scene = this.getScene(sceneId);
    if (!scene) {
      throw new Error(`CloudSceneManager: 情景 ${sceneId} 未找到`);
    }
    
    try {
      // 构建执行命令
      const command = this.cloudService.createControlCommand([
        {
          id: scene.id,
          customData: scene.customData
        }
      ], [
        {
          command: 'action.devices.commands.ActivateScene',
          params: {}
        }
      ]);
      
      const response = await this.cloudService.controlDevices([command]);
      const result = this.cloudService.parseControlResponse(response);
      
      console.log(`执行情景 ${sceneId} 结果:`, result);
      this.emit('sceneExecuted', sceneId, result);
      
      return result;
    } catch (error) {
      console.error(`CloudSceneManager: 执行情景 ${sceneId} 失败:`, error);
      this.emit('sceneExecutionError', sceneId, error);
      throw error;
    }
  }
  
  /**
   * 按情景类型过滤情景
   * @param {string} type - 情景类型
   * @returns {Array} 过滤后的情景列表
   */
  getScenesByType(type) {
    return this.getScenes().filter(scene => scene.type === type);
  }
  
  /**
   * 获取可撤销的情景
   * @returns {Array} 可撤销的情景列表
   */
  getReversibleScenes() {
    return this.getScenes().filter(scene => scene.sceneReversible);
  }
  
  /**
   * 撤销情景
   * @param {string} sceneId - 情景ID
   * @returns {Promise<Object>} 撤销结果
   */
  async reverseScene(sceneId) {
    if (!this.cloudService.isAuthenticated()) {
      throw new Error('CloudSceneManager: 未认证，无法撤销情景');
    }
    
    const scene = this.getScene(sceneId);
    if (!scene) {
      throw new Error(`CloudSceneManager: 情景 ${sceneId} 未找到`);
    }
    
    if (!scene.sceneReversible) {
      throw new Error(`CloudSceneManager: 情景 ${sceneId} 不可撤销`);
    }
    
    try {
      // 构建撤销命令
      const command = this.cloudService.createControlCommand([
        {
          id: scene.id,
          customData: scene.customData
        }
      ], [
        {
          command: 'action.devices.commands.ActivateScene',
          params: {
            deactivate: true
          }
        }
      ]);
      
      const response = await this.cloudService.controlDevices([command]);
      const result = this.cloudService.parseControlResponse(response);
      
      console.log(`撤销情景 ${sceneId} 结果:`, result);
      this.emit('sceneReversed', sceneId, result);
      
      return result;
    } catch (error) {
      console.error(`CloudSceneManager: 撤销情景 ${sceneId} 失败:`, error);
      this.emit('sceneReversalError', sceneId, error);
      throw error;
    }
  }
}

module.exports = CloudSceneManager;
