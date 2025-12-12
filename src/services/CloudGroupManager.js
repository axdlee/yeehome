const EventEmitter = require('events');
const YeelightCloudService = require('./YeelightCloudService');

class CloudGroupManager extends EventEmitter {
  constructor() {
    super();
    // 使用单例模式获取云服务实例
    this.cloudService = YeelightCloudService.getInstance();
    this.groups = new Map(); // 存储云端分组，key为groupId
    this.lastSyncTime = null;
  }
  
  /**
   * 同步分组列表
   * @returns {Promise<void>}
   */
  async syncGroups() {
    if (!this.cloudService.isAuthenticated()) {
      throw new Error('CloudGroupManager: 未认证，无法同步分组');
    }
    
    try {
      // 目前Yeelight IoT开放平台的分组信息是通过设备列表返回的，设备中包含分组信息
      // 后续如果有单独的分组API，可以直接调用
      const response = await this.cloudService.discoverDevices();
      const devices = this.cloudService.parseDevicesResponse(response);
      
      // 从设备中提取分组信息
      const groupsMap = new Map();
      
      devices.forEach(device => {
        // 假设设备中包含groupId和groupName字段
        // 如果设备中没有直接的分组信息，需要根据设备ID或其他信息关联
        const groupId = device.groupId || 'default';
        const groupName = device.groupName || '默认分组';
        
        if (!groupsMap.has(groupId)) {
          groupsMap.set(groupId, {
            id: groupId,
            name: groupName,
            description: `云端分组 ${groupName}`,
            devices: [device.id],
            source: 'cloud',
            defaultPowerState: true,
            defaultBrightness: 50,
            defaultCT: 4000
          });
        } else {
          const group = groupsMap.get(groupId);
          group.devices.push(device.id);
        }
      });
      
      // 更新分组列表
      this.groups = groupsMap;
      this.lastSyncTime = Date.now();
      
      console.log(`云端分组同步完成，共发现 ${this.groups.size} 个分组`);
      this.emit('groupsSynced', Array.from(this.groups.values()));
    } catch (error) {
      console.error('CloudGroupManager: 同步分组失败:', error);
      this.emit('syncError', error);
      throw error;
    }
  }
  
  /**
   * 获取所有分组
   * @returns {Array} 分组列表
   */
  getGroups() {
    return Array.from(this.groups.values());
  }
  
  /**
   * 获取单个分组
   * @param {string} groupId - 分组ID
   * @returns {Object|null} 分组信息或null
   */
  getGroup(groupId) {
    return this.groups.get(groupId) || null;
  }
  
  /**
   * 添加分组
   * @param {Object} group - 分组对象
   */
  addGroup(group) {
    this.groups.set(group.id, group);
    this.emit('groupAdded', group);
  }
  
  /**
   * 更新分组信息
   * @param {Object} group - 更新后的分组信息
   */
  updateGroup(group) {
    this.groups.set(group.id, group);
    this.emit('groupUpdated', group);
  }
  
  /**
   * 删除分组
   * @param {string} groupId - 分组ID
   */
  deleteGroup(groupId) {
    this.groups.delete(groupId);
    this.emit('groupDeleted', groupId);
  }
  
  /**
   * 获取最后同步时间
   * @returns {Date|null} 最后同步时间
   */
  getLastSyncTime() {
    return this.lastSyncTime;
  }
  
  /**
   * 检查是否需要同步分组
   * @returns {boolean} 是否需要同步
   */
  shouldSyncGroups() {
    if (!this.cloudService.isAuthenticated()) {
      return false;
    }
    
    // 检查是否超过30分钟未同步
    const now = Date.now();
    return !this.lastSyncTime || (now - this.lastSyncTime > 30 * 60 * 1000);
  }
  
  /**
   * 将设备添加到分组
   * @param {string} groupId - 分组ID
   * @param {string} deviceId - 设备ID
   * @returns {boolean} 是否添加成功
   */
  addDeviceToGroup(groupId, deviceId) {
    const group = this.getGroup(groupId);
    if (!group) {
      return false;
    }
    
    if (!group.devices.includes(deviceId)) {
      group.devices.push(deviceId);
      this.emit('deviceAddedToGroup', groupId, deviceId);
    }
    
    return true;
  }
  
  /**
   * 将设备从分组中移除
   * @param {string} groupId - 分组ID
   * @param {string} deviceId - 设备ID
   * @returns {boolean} 是否移除成功
   */
  removeDeviceFromGroup(groupId, deviceId) {
    const group = this.getGroup(groupId);
    if (!group) {
      return false;
    }
    
    const index = group.devices.indexOf(deviceId);
    if (index > -1) {
      group.devices.splice(index, 1);
      this.emit('deviceRemovedFromGroup', groupId, deviceId);
    }
    
    return true;
  }
  
  /**
   * 获取分组中的设备
   * @param {string} groupId - 分组ID
   * @returns {Array} 设备ID列表
   */
  getDevicesInGroup(groupId) {
    const group = this.getGroup(groupId);
    return group ? group.devices : [];
  }
  
  /**
   * 设置分组默认状态
   * @param {string} groupId - 分组ID
   * @param {Object} defaultState - 默认状态
   * @returns {Object|null} 更新后的分组信息
   */
  setDefaultState(groupId, defaultState) {
    const group = this.getGroup(groupId);
    if (!group) {
      return null;
    }
    
    // 更新默认状态
    group.defaultPowerState = defaultState.powerState !== undefined ? defaultState.powerState : group.defaultPowerState;
    group.defaultBrightness = defaultState.brightness !== undefined ? defaultState.brightness : group.defaultBrightness;
    group.defaultCT = defaultState.ct !== undefined ? defaultState.ct : group.defaultCT;
    
    this.emit('groupUpdated', group);
    
    return group;
  }
  
  /**
   * 获取分组默认状态
   * @param {string} groupId - 分组ID
   * @returns {Object|null} 默认状态
   */
  getDefaultState(groupId) {
    const group = this.getGroup(groupId);
    if (!group) {
      return null;
    }
    
    return {
      powerState: group.defaultPowerState,
      brightness: group.defaultBrightness,
      ct: group.defaultCT
    };
  }
  
  /**
   * 控制分组设备
   * @param {string} groupId - 分组ID
   * @param {Array} executions - 执行命令列表
   * @returns {Promise<Object>} 控制结果
   */
  async controlGroup(groupId, executions) {
    if (!this.cloudService.isAuthenticated()) {
      throw new Error('CloudGroupManager: 未认证，无法控制分组');
    }
    
    const group = this.getGroup(groupId);
    if (!group) {
      throw new Error(`CloudGroupManager: 分组 ${groupId} 未找到`);
    }
    
    try {
      // 构建分组控制命令
      const commands = [];
      
      group.devices.forEach(deviceId => {
        const device = {
          id: deviceId,
          // 假设设备对象中包含customData字段
          // 实际使用时需要从设备管理器中获取完整设备信息
          customData: {}
        };
        
        const command = this.cloudService.createControlCommand([device], executions);
        commands.push(command);
      });
      
      if (commands.length === 0) {
        return {
          success: false,
          commands: []
        };
      }
      
      const response = await this.cloudService.controlDevices(commands);
      return this.cloudService.parseControlResponse(response);
    } catch (error) {
      console.error(`CloudGroupManager: 控制分组 ${groupId} 失败:`, error);
      throw error;
    }
  }
  
  /**
   * 控制分组电源
   * @param {string} groupId - 分组ID
   * @param {boolean} power - 电源状态（true: 开, false: 关）
   * @returns {Promise<Object>} 控制结果
   */
  async toggleGroupPower(groupId, power) {
    const executions = [
      {
        command: 'action.devices.commands.OnOff',
        params: {
          on: power
        }
      }
    ];
    
    return this.controlGroup(groupId, executions);
  }
  
  /**
   * 设置分组亮度
   * @param {string} groupId - 分组ID
   * @param {number} brightness - 亮度值（1-100）
   * @returns {Promise<Object>} 控制结果
   */
  async setGroupBrightness(groupId, brightness) {
    const executions = [
      {
        command: 'action.devices.commands.BrightnessAbsolute',
        params: {
          brightness: brightness
        }
      }
    ];
    
    return this.controlGroup(groupId, executions);
  }
}

module.exports = CloudGroupManager;
