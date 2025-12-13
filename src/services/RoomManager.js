const BaseRepository = require('./core/BaseRepository');

/**
 * 房间管理器
 * 继承自 BaseRepository，提供房间特定的业务逻辑
 *
 * @class RoomManager
 * @extends BaseRepository
 *
 * @fires RoomManager#roomCreated - 创建房间
 * @fires RoomManager#roomUpdated - 更新房间
 * @fires RoomManager#roomDeleted - 删除房间
 * @fires RoomManager#deviceAdded - 设备添加到房间
 * @fires RoomManager#deviceRemoved - 设备从房间移除
 */
class RoomManager extends BaseRepository {
  constructor() {
    super('rooms.json');

    // 转发基类事件到房间特定事件
    this.on('created', (room) => this.emit('roomCreated', room));
    this.on('updated', (room) => this.emit('roomUpdated', room));
    this.on('deleted', (room) => this.emit('roomDeleted', room));
  }

  /**
   * 获取默认房间数据
   * @override
   * @returns {Array} 默认房间列表
   */
  getDefaultData() {
    return [
      { id: 1, name: '客厅', devices: [] },
      { id: 2, name: '卧室', devices: [] },
      { id: 3, name: '书房', devices: [] }
    ];
  }

  /**
   * 验证房间数据
   * @override
   * @param {Object} item - 房间数据
   * @throws {Error} 验证失败时抛出错误
   */
  validateItem(item) {
    if (!item.name || item.name.trim() === '') {
      throw new Error('房间名称不能为空');
    }

    // 检查名称是否重复（排除自身）
    const existing = this.data.find(r => r.name === item.name && r.id !== item.id);
    if (existing) {
      throw new Error('房间名称已存在');
    }

    // 确保 devices 字段存在且是数组
    if (!item.devices) {
      item.devices = [];
    } else if (!Array.isArray(item.devices)) {
      throw new Error('devices 字段必须是数组');
    }
  }

  /**
   * 获取所有房间（兼容旧接口）
   * @returns {Array} 房间列表
   */
  getRooms() {
    return this.findAll();
  }

  /**
   * 根据ID获取房间（兼容旧接口）
   * @param {number} id - 房间ID
   * @returns {Object|null} 房间信息
   */
  getRoom(id) {
    return this.findById(id);
  }

  /**
   * 创建新房间（兼容旧接口）
   * @param {string} name - 房间名称
   * @returns {Object} 新创建的房间
   */
  createRoom(name) {
    return this.create({ name, devices: [] });
  }

  /**
   * 更新房间（兼容旧接口）
   * @param {number} id - 房间ID
   * @param {string} name - 新房间名称
   * @returns {Object|null} 更新后的房间
   */
  updateRoom(id, name) {
    return this.update(id, { name });
  }

  /**
   * 删除房间（兼容旧接口）
   * @param {number} id - 房间ID
   * @returns {boolean} 是否成功删除
   */
  deleteRoom(id) {
    return this.delete(id);
  }

  /**
   * 向房间添加设备
   * @param {number} roomId - 房间ID
   * @param {string} deviceId - 设备ID
   * @returns {boolean} 是否成功添加
   */
  addDeviceToRoom(roomId, deviceId) {
    const room = this.findById(roomId);
    if (!room) {
      console.error(`RoomManager: 房间 ${roomId} 不存在`);
      return false;
    }

    // 确保 devices 数组存在
    if (!room.devices) {
      room.devices = [];
    }

    // 检查设备是否已在房间中
    if (room.devices.includes(deviceId)) {
      console.warn(`RoomManager: 设备 ${deviceId} 已在房间 ${roomId} 中`);
      return false;
    }

    // 添加设备
    room.devices.push(deviceId);

    // 更新房间
    this.update(roomId, { devices: room.devices });

    // 触发事件
    this.emit('deviceAdded', roomId, deviceId);

    return true;
  }

  /**
   * 从房间移除设备
   * @param {number} roomId - 房间ID
   * @param {string} deviceId - 设备ID
   * @returns {boolean} 是否成功移除
   */
  removeDeviceFromRoom(roomId, deviceId) {
    const room = this.findById(roomId);
    if (!room) {
      console.error(`RoomManager: 房间 ${roomId} 不存在`);
      return false;
    }

    if (!room.devices) {
      return false;
    }

    const index = room.devices.indexOf(deviceId);
    if (index === -1) {
      console.warn(`RoomManager: 设备 ${deviceId} 不在房间 ${roomId} 中`);
      return false;
    }

    // 移除设备
    room.devices.splice(index, 1);

    // 更新房间
    this.update(roomId, { devices: room.devices });

    // 触发事件
    this.emit('deviceRemoved', roomId, deviceId);

    return true;
  }

  /**
   * 获取房间中的所有设备ID
   * @param {number} roomId - 房间ID
   * @returns {Array<string>} 设备ID列表
   */
  getDevicesInRoom(roomId) {
    const room = this.findById(roomId);
    return room && room.devices ? room.devices : [];
  }

  /**
   * 查找包含指定设备的房间
   * @param {string} deviceId - 设备ID
   * @returns {Array<Object>} 包含该设备的房间列表
   */
  findRoomsByDevice(deviceId) {
    return this.findBy(room => room.devices && room.devices.includes(deviceId));
  }

  /**
   * 批量移除设备（从所有房间）
   * @param {string} deviceId - 设备ID
   * @returns {number} 移除的次数
   */
  removeDeviceFromAllRooms(deviceId) {
    let count = 0;

    for (const room of this.data) {
      if (room.devices && room.devices.includes(deviceId)) {
        const index = room.devices.indexOf(deviceId);
        room.devices.splice(index, 1);
        count++;
      }
    }

    if (count > 0) {
      this.save();
      console.log(`RoomManager: 设备 ${deviceId} 已从 ${count} 个房间中移除`);
    }

    return count;
  }
}

module.exports = RoomManager;
