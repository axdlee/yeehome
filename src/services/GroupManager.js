const BaseRepository = require('./core/BaseRepository');

/**
 * 灯组管理器
 * 继承自 BaseRepository，提供灯组特定的业务逻辑
 *
 * @class GroupManager
 * @extends BaseRepository
 *
 * @fires GroupManager#groupCreated - 创建灯组
 * @fires GroupManager#groupUpdated - 更新灯组
 * @fires GroupManager#groupDeleted - 删除灯组
 * @fires GroupManager#deviceAdded - 设备添加到灯组
 * @fires GroupManager#deviceRemoved - 设备从灯组移除
 */
class GroupManager extends BaseRepository {
  constructor() {
    super('groups.json');

    // 转发基类事件到灯组特定事件
    this.on('created', (group) => this.emit('groupCreated', group));
    this.on('updated', (group) => this.emit('groupUpdated', group));
    this.on('deleted', (group) => this.emit('groupDeleted', group));
  }

  /**
   * 获取默认灯组数据
   * @override
   * @returns {Array} 默认灯组列表
   */
  getDefaultData() {
    return [
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
  }

  /**
   * 验证灯组数据
   * @override
   * @param {Object} item - 灯组数据
   * @throws {Error} 验证失败时抛出错误
   */
  validateItem(item) {
    if (!item.name || item.name.trim() === '') {
      throw new Error('灯组名称不能为空');
    }

    // 检查名称是否重复（排除自身）
    const existing = this.data.find(g => g.name === item.name && g.id !== item.id);
    if (existing) {
      throw new Error('灯组名称已存在');
    }

    // 确保必要字段存在
    if (!item.devices) {
      item.devices = [];
    } else if (!Array.isArray(item.devices)) {
      throw new Error('devices 字段必须是数组');
    }

    // 验证默认状态值
    if (item.defaultBrightness !== undefined) {
      if (item.defaultBrightness < 1 || item.defaultBrightness > 100) {
        throw new Error('默认亮度必须在 1-100 范围内');
      }
    }

    if (item.defaultCT !== undefined) {
      if (item.defaultCT < 1700 || item.defaultCT > 6500) {
        throw new Error('默认色温必须在 1700-6500 范围内');
      }
    }
  }

  /**
   * 获取所有灯组（兼容旧接口）
   * @returns {Array} 灯组列表
   */
  getGroups() {
    return this.findAll();
  }

  /**
   * 根据ID获取灯组（兼容旧接口）
   * @param {number} id - 灯组ID
   * @returns {Object|null} 灯组信息
   */
  getGroup(id) {
    return this.findById(id);
  }

  /**
   * 创建新灯组（兼容旧接口）
   * @param {string} name - 灯组名称
   * @param {string} description - 灯组描述
   * @param {Object} [options] - 可选配置
   * @returns {Object} 新创建的灯组
   */
  createGroup(name, description, options = {}) {
    return this.create({
      name,
      description: description || '',
      devices: [],
      defaultPowerState: options.defaultPowerState !== undefined ? options.defaultPowerState : true,
      defaultBrightness: options.defaultBrightness || 80,
      defaultCT: options.defaultCT || 4000
    });
  }

  /**
   * 更新灯组（兼容旧接口）
   * @param {number} id - 灯组ID
   * @param {string} name - 新灯组名称
   * @param {string} description - 新灯组描述
   * @returns {Object|null} 更新后的灯组
   */
  updateGroup(id, name, description) {
    return this.update(id, { name, description });
  }

  /**
   * 删除灯组（兼容旧接口）
   * @param {number} id - 灯组ID
   * @returns {boolean} 是否成功删除
   */
  deleteGroup(id) {
    return this.delete(id);
  }

  /**
   * 向灯组添加设备
   * @param {number} groupId - 灯组ID
   * @param {string} deviceId - 设备ID
   * @returns {boolean} 是否成功添加
   */
  addDeviceToGroup(groupId, deviceId) {
    const group = this.findById(groupId);
    if (!group) {
      console.error(`GroupManager: 灯组 ${groupId} 不存在`);
      return false;
    }

    if (!group.devices) {
      group.devices = [];
    }

    if (group.devices.includes(deviceId)) {
      console.warn(`GroupManager: 设备 ${deviceId} 已在灯组 ${groupId} 中`);
      return false;
    }

    group.devices.push(deviceId);
    this.update(groupId, { devices: group.devices });
    this.emit('deviceAdded', groupId, deviceId);

    return true;
  }

  /**
   * 从灯组移除设备
   * @param {number} groupId - 灯组ID
   * @param {string} deviceId - 设备ID
   * @returns {boolean} 是否成功移除
   */
  removeDeviceFromGroup(groupId, deviceId) {
    const group = this.findById(groupId);
    if (!group) {
      console.error(`GroupManager: 灯组 ${groupId} 不存在`);
      return false;
    }

    if (!group.devices) {
      return false;
    }

    const index = group.devices.indexOf(deviceId);
    if (index === -1) {
      console.warn(`GroupManager: 设备 ${deviceId} 不在灯组 ${groupId} 中`);
      return false;
    }

    group.devices.splice(index, 1);
    this.update(groupId, { devices: group.devices });
    this.emit('deviceRemoved', groupId, deviceId);

    return true;
  }

  /**
   * 获取灯组中的所有设备ID
   * @param {number} groupId - 灯组ID
   * @returns {Array<string>} 设备ID列表
   */
  getDevicesInGroup(groupId) {
    const group = this.findById(groupId);
    return group && group.devices ? group.devices : [];
  }

  /**
   * 查找包含指定设备的灯组
   * @param {string} deviceId - 设备ID
   * @returns {Array<Object>} 包含该设备的灯组列表
   */
  findGroupsByDevice(deviceId) {
    return this.findBy(group => group.devices && group.devices.includes(deviceId));
  }

  /**
   * 批量移除设备（从所有灯组）
   * @param {string} deviceId - 设备ID
   * @returns {number} 移除的次数
   */
  removeDeviceFromAllGroups(deviceId) {
    let count = 0;

    for (const group of this.data) {
      if (group.devices && group.devices.includes(deviceId)) {
        const index = group.devices.indexOf(deviceId);
        group.devices.splice(index, 1);
        count++;
      }
    }

    if (count > 0) {
      this.save();
      console.log(`GroupManager: 设备 ${deviceId} 已从 ${count} 个灯组中移除`);
    }

    return count;
  }

  /**
   * 更新灯组默认状态
   * @param {number} groupId - 灯组ID
   * @param {Object} defaults - 默认状态
   * @returns {Object|null} 更新后的灯组
   */
  updateGroupDefaults(groupId, defaults) {
    const updates = {};

    if (defaults.powerState !== undefined) {
      updates.defaultPowerState = defaults.powerState;
    }
    if (defaults.brightness !== undefined) {
      updates.defaultBrightness = Math.max(1, Math.min(100, defaults.brightness));
    }
    if (defaults.ct !== undefined) {
      updates.defaultCT = Math.max(1700, Math.min(6500, defaults.ct));
    }

    return this.update(groupId, updates);
  }
}

module.exports = GroupManager;
