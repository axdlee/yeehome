const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');

class GroupManager extends EventEmitter {
  constructor() {
    super();
    this.groups = [];
    this.dataPath = path.join(__dirname, '../data');
    this.groupsFilePath = path.join(this.dataPath, 'groups.json');
    
    // 确保数据目录存在
    this.ensureDataDirectory();
    
    // 加载灯组数据
    this.loadGroups();
  }

  /**
   * 确保数据目录存在
   */
  ensureDataDirectory() {
    if (!fs.existsSync(this.dataPath)) {
      fs.mkdirSync(this.dataPath, { recursive: true });
    }
  }

  /**
   * 从文件加载灯组数据
   */
  loadGroups() {
    try {
      if (fs.existsSync(this.groupsFilePath)) {
        const data = fs.readFileSync(this.groupsFilePath, 'utf8');
        this.groups = JSON.parse(data);
        console.log('已加载灯组数据:', this.groups);
      } else {
        // 初始化默认灯组
        this.groups = [
          {
            id: 1,
            name: '客厅灯组',
            description: '客厅的所有灯光设备',
            devices: [],
            defaultPowerState: true,
            defaultBrightness: 80,
            defaultCT: 4000
          },
          {
            id: 2,
            name: '卧室灯组',
            description: '卧室的所有灯光设备',
            devices: [],
            defaultPowerState: true,
            defaultBrightness: 60,
            defaultCT: 3000
          }
        ];
        this.saveGroups();
        console.log('已初始化默认灯组数据');
      }
    } catch (error) {
      console.error('加载灯组数据错误:', error);
      this.groups = [];
    }
  }

  /**
   * 保存灯组数据到文件
   */
  saveGroups() {
    try {
      fs.writeFileSync(this.groupsFilePath, JSON.stringify(this.groups, null, 2), 'utf8');
      console.log('灯组数据已保存');
    } catch (error) {
      console.error('保存灯组数据错误:', error);
    }
  }

  /**
   * 获取所有灯组
   * @returns {Array} 灯组列表
   */
  getGroups() {
    return this.groups;
  }

  /**
   * 根据ID获取灯组
   * @param {number} id - 灯组ID
   * @returns {Object|null} 灯组信息
   */
  getGroup(id) {
    return this.groups.find(group => group.id === id) || null;
  }

  /**
   * 创建新灯组
   * @param {string} name - 灯组名称
   * @param {string} description - 灯组描述
   * @returns {Object} 新创建的灯组
   */
  createGroup(name, description = '') {
    if (!name || name.trim() === '') {
      throw new Error('灯组名称不能为空');
    }

    // 检查灯组名称是否已存在
    const existingGroup = this.groups.find(group => group.name === name);
    if (existingGroup) {
      throw new Error('灯组名称已存在');
    }

    // 创建新灯组
    const newGroup = {
      id: Date.now(),
      name: name,
      description: description,
      devices: [],
      defaultPowerState: true,
      defaultBrightness: 50,
      defaultCT: 4000
    };

    this.groups.push(newGroup);
    this.saveGroups();
    this.emit('groupCreated', newGroup);

    return newGroup;
  }

  /**
   * 更新灯组
   * @param {number} id - 灯组ID
   * @param {string} name - 新的灯组名称
   * @param {string} description - 新的灯组描述
   * @returns {Object|null} 更新后的灯组信息
   */
  updateGroup(id, name, description = '') {
    if (!name || name.trim() === '') {
      throw new Error('灯组名称不能为空');
    }

    const index = this.groups.findIndex(group => group.id === id);
    if (index === -1) {
      return null;
    }

    // 检查灯组名称是否已存在（排除当前灯组）
    const existingGroup = this.groups.find(group => group.name === name && group.id !== id);
    if (existingGroup) {
      throw new Error('灯组名称已存在');
    }

    this.groups[index].name = name;
    this.groups[index].description = description;
    
    this.saveGroups();
    this.emit('groupUpdated', this.groups[index]);

    return this.groups[index];
  }

  /**
   * 删除灯组
   * @param {number} id - 灯组ID
   * @returns {boolean} 是否删除成功
   */
  deleteGroup(id) {
    const index = this.groups.findIndex(group => group.id === id);
    if (index === -1) {
      return false;
    }

    const deletedGroup = this.groups.splice(index, 1)[0];
    this.saveGroups();
    this.emit('groupDeleted', deletedGroup);

    return true;
  }

  /**
   * 将设备添加到灯组
   * @param {number} groupId - 灯组ID
   * @param {string} deviceId - 设备ID
   * @returns {boolean} 是否添加成功
   */
  addDeviceToGroup(groupId, deviceId) {
    const group = this.getGroup(groupId);
    if (!group) {
      return false;
    }

    // 检查设备是否已在灯组中
    if (group.devices.includes(deviceId)) {
      return true; // 设备已在灯组中，视为成功
    }

    group.devices.push(deviceId);
    this.saveGroups();
    this.emit('deviceAddedToGroup', groupId, deviceId);

    return true;
  }

  /**
   * 将设备从灯组中移除
   * @param {number} groupId - 灯组ID
   * @param {string} deviceId - 设备ID
   * @returns {boolean} 是否移除成功
   */
  removeDeviceFromGroup(groupId, deviceId) {
    const group = this.getGroup(groupId);
    if (!group) {
      return false;
    }

    const index = group.devices.indexOf(deviceId);
    if (index === -1) {
      return true; // 设备不在灯组中，视为成功
    }

    group.devices.splice(index, 1);
    this.saveGroups();
    this.emit('deviceRemovedFromGroup', groupId, deviceId);

    return true;
  }

  /**
   * 获取灯组中的设备
   * @param {number} groupId - 灯组ID
   * @returns {Array} 设备ID列表
   */
  getDevicesInGroup(groupId) {
    const group = this.getGroup(groupId);
    return group ? group.devices : [];
  }

  /**
   * 获取设备所在的灯组
   * @param {string} deviceId - 设备ID
   * @returns {Array} 灯组列表
   */
  getGroupsForDevice(deviceId) {
    return this.groups.filter(group => group.devices.includes(deviceId));
  }

  /**
   * 设置灯组默认状态
   * @param {number} groupId - 灯组ID
   * @param {Object} defaultState - 默认状态
   * @returns {Object|null} 更新后的灯组信息
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
    
    this.saveGroups();
    this.emit('groupUpdated', group);

    return group;
  }

  /**
   * 获取灯组默认状态
   * @param {number} groupId - 灯组ID
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
   * 清理不存在的设备引用
   * @param {Array} validDeviceIds - 有效的设备ID列表
   */
  cleanupDevices(validDeviceIds) {
    let hasChanges = false;
    
    this.groups.forEach(group => {
      const originalLength = group.devices.length;
      group.devices = group.devices.filter(deviceId => validDeviceIds.includes(deviceId));
      if (group.devices.length !== originalLength) {
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      this.saveGroups();
      this.emit('groupsCleanedUp');
    }
  }

  /**
   * 获取灯组统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      totalGroups: this.groups.length,
      totalDevices: this.groups.reduce((sum, group) => sum + group.devices.length, 0)
    };
  }
}