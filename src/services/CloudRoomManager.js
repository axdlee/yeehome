const EventEmitter = require('events');
const YeelightCloudService = require('./YeelightCloudService');

class CloudRoomManager extends EventEmitter {
  constructor() {
    super();
    // 使用单例模式获取云服务实例
    this.cloudService = YeelightCloudService.getInstance();
    this.rooms = new Map(); // 存储云端房间，key为roomId
    this.lastSyncTime = null;
  }
  
  /**
   * 同步房间列表
   * @returns {Promise<void>}
   */
  async syncRooms() {
    if (!this.cloudService.isAuthenticated()) {
      throw new Error('CloudRoomManager: 未认证，无法同步房间');
    }
    
    try {
      // 目前Yeelight IoT开放平台的房间信息是通过设备列表返回的，设备中包含房间信息
      // 后续如果有单独的房间API，可以直接调用
      const response = await this.cloudService.discoverDevices();
      const devices = this.cloudService.parseDevicesResponse(response);
      
      // 从设备中提取房间信息
      const roomsMap = new Map();
      
      devices.forEach(device => {
        // 假设设备中包含roomId和roomName字段
        // 如果设备中没有直接的房间信息，需要根据设备ID或其他信息关联
        const roomId = device.roomId || 'default';
        const roomName = device.roomName || '默认房间';
        
        if (!roomsMap.has(roomId)) {
          roomsMap.set(roomId, {
            id: roomId,
            name: roomName,
            devices: [device.id],
            source: 'cloud'
          });
        } else {
          const room = roomsMap.get(roomId);
          room.devices.push(device.id);
        }
      });
      
      // 更新房间列表
      this.rooms = roomsMap;
      this.lastSyncTime = Date.now();
      
      console.log(`云端房间同步完成，共发现 ${this.rooms.size} 个房间`);
      this.emit('roomsSynced', Array.from(this.rooms.values()));
    } catch (error) {
      console.error('CloudRoomManager: 同步房间失败:', error);
      this.emit('syncError', error);
      throw error;
    }
  }
  
  /**
   * 获取所有房间
   * @returns {Array} 房间列表
   */
  getRooms() {
    return Array.from(this.rooms.values());
  }
  
  /**
   * 获取单个房间
   * @param {string} roomId - 房间ID
   * @returns {Object|null} 房间信息或null
   */
  getRoom(roomId) {
    return this.rooms.get(roomId) || null;
  }
  
  /**
   * 添加房间
   * @param {Object} room - 房间对象
   */
  addRoom(room) {
    this.rooms.set(room.id, room);
    this.emit('roomAdded', room);
  }
  
  /**
   * 更新房间信息
   * @param {Object} room - 更新后的房间信息
   */
  updateRoom(room) {
    this.rooms.set(room.id, room);
    this.emit('roomUpdated', room);
  }
  
  /**
   * 删除房间
   * @param {string} roomId - 房间ID
   */
  deleteRoom(roomId) {
    this.rooms.delete(roomId);
    this.emit('roomDeleted', roomId);
  }
  
  /**
   * 获取最后同步时间
   * @returns {Date|null} 最后同步时间
   */
  getLastSyncTime() {
    return this.lastSyncTime;
  }
  
  /**
   * 检查是否需要同步房间
   * @returns {boolean} 是否需要同步
   */
  shouldSyncRooms() {
    if (!this.cloudService.isAuthenticated()) {
      return false;
    }
    
    // 检查是否超过30分钟未同步
    const now = Date.now();
    return !this.lastSyncTime || (now - this.lastSyncTime > 30 * 60 * 1000);
  }
  
  /**
   * 将设备添加到房间
   * @param {string} roomId - 房间ID
   * @param {string} deviceId - 设备ID
   * @returns {boolean} 是否添加成功
   */
  addDeviceToRoom(roomId, deviceId) {
    const room = this.getRoom(roomId);
    if (!room) {
      return false;
    }
    
    if (!room.devices.includes(deviceId)) {
      room.devices.push(deviceId);
      this.emit('deviceAddedToRoom', roomId, deviceId);
    }
    
    return true;
  }
  
  /**
   * 将设备从房间中移除
   * @param {string} roomId - 房间ID
   * @param {string} deviceId - 设备ID
   * @returns {boolean} 是否移除成功
   */
  removeDeviceFromRoom(roomId, deviceId) {
    const room = this.getRoom(roomId);
    if (!room) {
      return false;
    }
    
    const index = room.devices.indexOf(deviceId);
    if (index > -1) {
      room.devices.splice(index, 1);
      this.emit('deviceRemovedFromRoom', roomId, deviceId);
    }
    
    return true;
  }
  
  /**
   * 获取房间中的设备
   * @param {string} roomId - 房间ID
   * @returns {Array} 设备ID列表
   */
  getDevicesInRoom(roomId) {
    const room = this.getRoom(roomId);
    return room ? room.devices : [];
  }
}

module.exports = CloudRoomManager;
