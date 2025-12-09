const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');

class RoomManager extends EventEmitter {
  constructor() {
    super();
    this.rooms = [];
    this.dataPath = path.join(__dirname, '../data');
    this.roomsFilePath = path.join(this.dataPath, 'rooms.json');
    
    // 确保数据目录存在
    this.ensureDataDirectory();
    
    // 加载房间数据
    this.loadRooms();
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
   * 从文件加载房间数据
   */
  loadRooms() {
    try {
      if (fs.existsSync(this.roomsFilePath)) {
        const data = fs.readFileSync(this.roomsFilePath, 'utf8');
        this.rooms = JSON.parse(data);
        console.log('已加载房间数据:', this.rooms);
      } else {
        // 初始化默认房间
        this.rooms = [
          { id: 1, name: '客厅', devices: [] },
          { id: 2, name: '卧室', devices: [] },
          { id: 3, name: '书房', devices: [] }
        ];
        this.saveRooms();
        console.log('已初始化默认房间数据');
      }
    } catch (error) {
      console.error('加载房间数据错误:', error);
      this.rooms = [];
    }
  }

  /**
   * 保存房间数据到文件
   */
  saveRooms() {
    try {
      fs.writeFileSync(this.roomsFilePath, JSON.stringify(this.rooms, null, 2), 'utf8');
      console.log('房间数据已保存');
    } catch (error) {
      console.error('保存房间数据错误:', error);
    }
  }

  /**
   * 获取所有房间
   * @returns {Array} 房间列表
   */
  getRooms() {
    return this.rooms;
  }

  /**
   * 根据ID获取房间
   * @param {number} id - 房间ID
   * @returns {Object|null} 房间信息
   */
  getRoom(id) {
    return this.rooms.find(room => room.id === id) || null;
  }

  /**
   * 创建新房间
   * @param {string} name - 房间名称
   * @returns {Object} 新创建的房间
   */
  createRoom(name) {
    if (!name || name.trim() === '') {
      throw new Error('房间名称不能为空');
    }

    // 检查房间名称是否已存在
    const existingRoom = this.rooms.find(room => room.name === name);
    if (existingRoom) {
      throw new Error('房间名称已存在');
    }

    // 创建新房间
    const newRoom = {
      id: Date.now(),
      name: name,
      devices: []
    };

    this.rooms.push(newRoom);
    this.saveRooms();
    this.emit('roomCreated', newRoom);

    return newRoom;
  }

  /**
   * 更新房间
   * @param {number} id - 房间ID
   * @param {string} name - 新的房间名称
   * @returns {Object|null} 更新后的房间信息
   */
  updateRoom(id, name) {
    if (!name || name.trim() === '') {
      throw new Error('房间名称不能为空');
    }

    const index = this.rooms.findIndex(room => room.id === id);
    if (index === -1) {
      return null;
    }

    // 检查房间名称是否已存在（排除当前房间）
    const existingRoom = this.rooms.find(room => room.name === name && room.id !== id);
    if (existingRoom) {
      throw new Error('房间名称已存在');
    }

    this.rooms[index].name = name;
    this.saveRooms();
    this.emit('roomUpdated', this.rooms[index]);

    return this.rooms[index];
  }

  /**
   * 删除房间
   * @param {number} id - 房间ID
   * @returns {boolean} 是否删除成功
   */
  deleteRoom(id) {
    const index = this.rooms.findIndex(room => room.id === id);
    if (index === -1) {
      return false;
    }

    const deletedRoom = this.rooms.splice(index, 1)[0];
    this.saveRooms();
    this.emit('roomDeleted', deletedRoom);

    return true;
  }

  /**
   * 将设备添加到房间
   * @param {number} roomId - 房间ID
   * @param {string} deviceId - 设备ID
   * @returns {boolean} 是否添加成功
   */
  addDeviceToRoom(roomId, deviceId) {
    const room = this.getRoom(roomId);
    if (!room) {
      return false;
    }

    // 检查设备是否已在房间中
    if (room.devices.includes(deviceId)) {
      return true; // 设备已在房间中，视为成功
    }

    room.devices.push(deviceId);
    this.saveRooms();
    this.emit('deviceAddedToRoom', roomId, deviceId);

    return true;
  }

  /**
   * 将设备从房间中移除
   * @param {number} roomId - 房间ID
   * @param {string} deviceId - 设备ID
   * @returns {boolean} 是否移除成功
   */
  removeDeviceFromRoom(roomId, deviceId) {
    const room = this.getRoom(roomId);
    if (!room) {
      return false;
    }

    const index = room.devices.indexOf(deviceId);
    if (index === -1) {
      return true; // 设备不在房间中，视为成功
    }

    room.devices.splice(index, 1);
    this.saveRooms();
    this.emit('deviceRemovedFromRoom', roomId, deviceId);

    return true;
  }

  /**
   * 获取房间中的设备
   * @param {number} roomId - 房间ID
   * @returns {Array} 设备ID列表
   */
  getDevicesInRoom(roomId) {
    const room = this.getRoom(roomId);
    return room ? room.devices : [];
  }

  /**
   * 获取设备所在的房间
   * @param {string} deviceId - 设备ID
   * @returns {Array} 房间列表
   */
  getRoomsForDevice(deviceId) {
    return this.rooms.filter(room => room.devices.includes(deviceId));
  }

  /**
   * 清理不存在的设备引用
   * @param {Array} validDeviceIds - 有效的设备ID列表
   */
  cleanupDevices(validDeviceIds) {
    let hasChanges = false;
    
    this.rooms.forEach(room => {
      const originalLength = room.devices.length;
      room.devices = room.devices.filter(deviceId => validDeviceIds.includes(deviceId));
      if (room.devices.length !== originalLength) {
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      this.saveRooms();
      this.emit('roomsCleanedUp');
    }
  }
}

module.exports = RoomManager;