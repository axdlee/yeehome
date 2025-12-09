const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');

class SceneManager extends EventEmitter {
  constructor() {
    super();
    this.scenes = [];
    this.dataPath = path.join(__dirname, '../data');
    this.scenesFilePath = path.join(this.dataPath, 'scenes.json');
    
    // 确保数据目录存在
    this.ensureDataDirectory();
    
    // 加载情景数据
    this.loadScenes();
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
   * 从文件加载情景数据
   */
  loadScenes() {
    try {
      if (fs.existsSync(this.scenesFilePath)) {
        const data = fs.readFileSync(this.scenesFilePath, 'utf8');
        this.scenes = JSON.parse(data);
        console.log('已加载情景数据:', this.scenes);
      } else {
        // 初始化默认情景
        this.scenes = [
          {
            id: 1,
            name: '阅读模式',
            description: '适合阅读的灯光设置',
            devices: [],
            actions: [
              { deviceId: 'all', method: 'set_power', params: ['on', 'smooth', 500] },
              { deviceId: 'all', method: 'set_bright', params: [80, 'smooth', 500] },
              { deviceId: 'all', method: 'set_ct_abx', params: [4000, 'smooth', 500] }
            ]
          },
          {
            id: 2,
            name: '观影模式',
            description: '适合看电影的灯光设置',
            devices: [],
            actions: [
              { deviceId: 'all', method: 'set_power', params: ['on', 'smooth', 500] },
              { deviceId: 'all', method: 'set_bright', params: [30, 'smooth', 500] },
              { deviceId: 'all', method: 'set_ct_abx', params: [2700, 'smooth', 500] }
            ]
          },
          {
            id: 3,
            name: '睡眠模式',
            description: '帮助睡眠的灯光设置',
            devices: [],
            actions: [
              { deviceId: 'all', method: 'set_power', params: ['on', 'smooth', 500] },
              { deviceId: 'all', method: 'set_bright', params: [10, 'smooth', 500] },
              { deviceId: 'all', method: 'set_ct_abx', params: [2000, 'smooth', 500] }
            ]
          }
        ];
        this.saveScenes();
        console.log('已初始化默认情景数据');
      }
    } catch (error) {
      console.error('加载情景数据错误:', error);
      this.scenes = [];
    }
  }

  /**
   * 保存情景数据到文件
   */
  saveScenes() {
    try {
      fs.writeFileSync(this.scenesFilePath, JSON.stringify(this.scenes, null, 2), 'utf8');
      console.log('情景数据已保存');
    } catch (error) {
      console.error('保存情景数据错误:', error);
    }
  }

  /**
   * 获取所有情景
   * @returns {Array} 情景列表
   */
  getScenes() {
    return this.scenes;
  }

  /**
   * 根据ID获取情景
   * @param {number} id - 情景ID
   * @returns {Object|null} 情景信息
   */
  getScene(id) {
    return this.scenes.find(scene => scene.id === id) || null;
  }

  /**
   * 创建新情景
   * @param {string} name - 情景名称
   * @param {string} description - 情景描述
   * @param {Array} actions - 情景动作列表
   * @returns {Object} 新创建的情景
   */
  createScene(name, description, actions = []) {
    if (!name || name.trim() === '') {
      throw new Error('情景名称不能为空');
    }

    // 检查情景名称是否已存在
    const existingScene = this.scenes.find(scene => scene.name === name);
    if (existingScene) {
      throw new Error('情景名称已存在');
    }

    // 创建新情景
    const newScene = {
      id: Date.now(),
      name: name,
      description: description || '',
      devices: [],
      actions: actions
    };

    this.scenes.push(newScene);
    this.saveScenes();
    this.emit('sceneCreated', newScene);

    return newScene;
  }

  /**
   * 更新情景
   * @param {number} id - 情景ID
   * @param {string} name - 新的情景名称
   * @param {string} description - 新的情景描述
   * @param {Array} actions - 新的情景动作列表
   * @returns {Object|null} 更新后的情景信息
   */
  updateScene(id, name, description, actions) {
    if (!name || name.trim() === '') {
      throw new Error('情景名称不能为空');
    }

    const index = this.scenes.findIndex(scene => scene.id === id);
    if (index === -1) {
      return null;
    }

    // 检查情景名称是否已存在（排除当前情景）
    const existingScene = this.scenes.find(scene => scene.name === name && scene.id !== id);
    if (existingScene) {
      throw new Error('情景名称已存在');
    }

    this.scenes[index].name = name;
    this.scenes[index].description = description || '';
    this.scenes[index].actions = actions || [];
    
    this.saveScenes();
    this.emit('sceneUpdated', this.scenes[index]);

    return this.scenes[index];
  }

  /**
   * 删除情景
   * @param {number} id - 情景ID
   * @returns {boolean} 是否删除成功
   */
  deleteScene(id) {
    const index = this.scenes.findIndex(scene => scene.id === id);
    if (index === -1) {
      return false;
    }

    const deletedScene = this.scenes.splice(index, 1)[0];
    this.saveScenes();
    this.emit('sceneDeleted', deletedScene);

    return true;
  }

  /**
   * 将设备添加到情景
   * @param {number} sceneId - 情景ID
   * @param {string} deviceId - 设备ID
   * @returns {boolean} 是否添加成功
   */
  addDeviceToScene(sceneId, deviceId) {
    const scene = this.getScene(sceneId);
    if (!scene) {
      return false;
    }

    // 检查设备是否已在情景中
    if (scene.devices.includes(deviceId)) {
      return true; // 设备已在情景中，视为成功
    }

    scene.devices.push(deviceId);
    this.saveScenes();
    this.emit('deviceAddedToScene', sceneId, deviceId);

    return true;
  }

  /**
   * 将设备从情景中移除
   * @param {number} sceneId - 情景ID
   * @param {string} deviceId - 设备ID
   * @returns {boolean} 是否移除成功
   */
  removeDeviceFromScene(sceneId, deviceId) {
    const scene = this.getScene(sceneId);
    if (!scene) {
      return false;
    }

    const index = scene.devices.indexOf(deviceId);
    if (index === -1) {
      return true; // 设备不在情景中，视为成功
    }

    scene.devices.splice(index, 1);
    this.saveScenes();
    this.emit('deviceRemovedFromScene', sceneId, deviceId);

    return true;
  }

  /**
   * 获取情景中的设备
   * @param {number} sceneId - 情景ID
   * @returns {Array} 设备ID列表
   */
  getDevicesInScene(sceneId) {
    const scene = this.getScene(sceneId);
    return scene ? scene.devices : [];
  }

  /**
   * 获取设备所在的情景
   * @param {string} deviceId - 设备ID
   * @returns {Array} 情景列表
   */
  getScenesForDevice(deviceId) {
    return this.scenes.filter(scene => scene.devices.includes(deviceId));
  }

  /**
   * 应用情景
   * @param {number} sceneId - 情景ID
   * @param {Array} deviceIds - 要应用情景的设备ID列表（可选）
   * @returns {Object} 包含要执行的动作的对象
   */
  applyScene(sceneId, deviceIds = null) {
    const scene = this.getScene(sceneId);
    if (!scene) {
      throw new Error('情景不存在');
    }

    console.log(`应用情景 ${scene.name} 到设备:`, deviceIds || '所有设备');
    
    // 确定要应用的设备
    const targetDevices = deviceIds || scene.devices.length > 0 ? scene.devices : ['all'];
    
    // 构建要执行的动作列表
    const actionsToExecute = [];
    
    scene.actions.forEach(action => {
      if (action.deviceId === 'all') {
        // 对所有目标设备执行相同动作
        targetDevices.forEach(deviceId => {
          actionsToExecute.push({
            deviceId: deviceId,
            method: action.method,
            params: action.params
          });
        });
      } else {
        // 只对指定设备执行动作
        if (targetDevices.includes(action.deviceId) || targetDevices.includes('all')) {
          actionsToExecute.push(action);
        }
      }
    });
    
    this.emit('sceneApplied', sceneId, actionsToExecute);
    
    return {
      scene: scene,
      actions: actionsToExecute
    };
  }

  /**
   * 清理不存在的设备引用
   * @param {Array} validDeviceIds - 有效的设备ID列表
   */
  cleanupDevices(validDeviceIds) {
    let hasChanges = false;
    
    this.scenes.forEach(scene => {
      const originalLength = scene.devices.length;
      scene.devices = scene.devices.filter(deviceId => validDeviceIds.includes(deviceId));
      if (scene.devices.length !== originalLength) {
        hasChanges = true;
      }
      
      // 清理动作中的设备引用
      scene.actions.forEach(action => {
        if (action.deviceId !== 'all' && !validDeviceIds.includes(action.deviceId)) {
          // 可以选择删除这个动作或保留它
          // 这里选择保留，因为用户可能会重新添加该设备
        }
      });
    });
    
    if (hasChanges) {
      this.saveScenes();
      this.emit('scenesCleanedUp');
    }
  }
}