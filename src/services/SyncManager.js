const EventEmitter = require('events');

class SyncManager extends EventEmitter {
  constructor(yeelightService, cloudDeviceManager, cloudRoomManager, cloudGroupManager, cloudSceneManager, cloudAutomationManager) {
    super();
    this.yeelightService = yeelightService;
    this.cloudDeviceManager = cloudDeviceManager;
    this.cloudRoomManager = cloudRoomManager;
    this.cloudGroupManager = cloudGroupManager;
    this.cloudSceneManager = cloudSceneManager;
    this.cloudAutomationManager = cloudAutomationManager;
    
    this.isSyncing = false;
    this.syncQueue = [];
    this.syncHistory = [];
    this.syncConfig = {
      autoSync: true,
      syncInterval: 30 * 60 * 1000, // 30分钟自动同步一次
      cloudPriority: true, // 云端优先，当本地和云端数据冲突时，以云端为准
      syncTypes: ['devices', 'rooms', 'groups', 'scenes', 'automations'] // 需要同步的数据类型
    };
    
    this.autoSyncTimer = null;
    
    // 注册事件监听器
    this.registerEventListeners();
    
    // 启动自动同步
    if (this.syncConfig.autoSync) {
      this.startAutoSync();
    }
  }
  
  /**
   * 注册事件监听器
   */
  registerEventListeners() {
    // 监听本地设备更新事件
    this.yeelightService.on('deviceAdded', (device) => {
      if (this.syncConfig.syncTypes.includes('devices')) {
        this.queueSync('deviceAdded', { device });
      }
    });
    
    this.yeelightService.on('deviceUpdated', (device) => {
      if (this.syncConfig.syncTypes.includes('devices')) {
        this.queueSync('deviceUpdated', { device });
      }
    });
    
    // 监听云端设备同步事件
    this.cloudDeviceManager.on('devicesSynced', (devices) => {
      if (this.syncConfig.syncTypes.includes('devices')) {
        this.syncLocalFromCloud('devices', devices);
      }
    });
    
    // 监听云端房间同步事件
    this.cloudRoomManager.on('roomsSynced', (rooms) => {
      if (this.syncConfig.syncTypes.includes('rooms')) {
        this.syncLocalFromCloud('rooms', rooms);
      }
    });
    
    // 监听云端分组同步事件
    this.cloudGroupManager.on('groupsSynced', (groups) => {
      if (this.syncConfig.syncTypes.includes('groups')) {
        this.syncLocalFromCloud('groups', groups);
      }
    });
    
    // 监听云端情景同步事件
    this.cloudSceneManager.on('scenesSynced', (scenes) => {
      if (this.syncConfig.syncTypes.includes('scenes')) {
        this.syncLocalFromCloud('scenes', scenes);
      }
    });
    
    // 监听云端自动化同步事件
    this.cloudAutomationManager.on('automationsSynced', (automations) => {
      if (this.syncConfig.syncTypes.includes('automations')) {
        this.syncLocalFromCloud('automations', automations);
      }
    });
  }
  
  /**
   * 队列同步任务
   * @param {string} eventType - 事件类型
   * @param {Object} data - 事件数据
   */
  queueSync(eventType, data) {
    this.syncQueue.push({ eventType, data, timestamp: Date.now() });
    this.processSyncQueue();
  }
  
  /**
   * 处理同步队列
   */
  async processSyncQueue() {
    if (this.isSyncing || this.syncQueue.length === 0) {
      return;
    }
    
    this.isSyncing = true;
    const syncTask = this.syncQueue.shift();
    
    try {
      await this.performSync(syncTask.eventType, syncTask.data);
      this.syncHistory.push({
        ...syncTask,
        status: 'success',
        processedAt: Date.now()
      });
      this.emit('syncCompleted', syncTask);
    } catch (error) {
      console.error('处理同步任务失败:', error);
      this.syncHistory.push({
        ...syncTask,
        status: 'error',
        error: error.message,
        processedAt: Date.now()
      });
      this.emit('syncError', syncTask, error);
    } finally {
      this.isSyncing = false;
      // 继续处理下一个同步任务
      this.processSyncQueue();
    }
  }
  
  /**
   * 执行同步
   * @param {string} eventType - 事件类型
   * @param {Object} data - 事件数据
   * @returns {Promise<void>}
   */
  async performSync(eventType, data) {
    console.log(`SyncManager: 执行同步任务 - ${eventType}`, data);
    
    switch (eventType) {
      case 'deviceAdded':
        // 本地设备添加，同步到云端
        await this.syncCloudFromLocal('devices', [data.device]);
        break;
      case 'deviceUpdated':
        // 本地设备更新，同步到云端
        await this.syncCloudFromLocal('devices', [data.device]);
        break;
      // 其他事件类型的处理
      default:
        console.log(`SyncManager: 未处理的同步事件类型 - ${eventType}`);
    }
  }
  
  /**
   * 从本地同步到云端
   * @param {string} type - 数据类型
   * @param {Array} localData - 本地数据
   * @returns {Promise<void>}
   */
  async syncCloudFromLocal(type, localData) {
    console.log(`SyncManager: 从本地同步到云端 - ${type}`, localData);
    
    try {
      // 根据数据类型执行不同的同步逻辑
      switch (type) {
        case 'devices':
          // 目前Yeelight IoT开放平台不支持从云端添加或修改设备
          // 设备管理主要在Yeelight APP中进行，云端API主要用于查询和控制
          console.log('SyncManager: 设备同步到云端 - 目前不支持');
          break;
        case 'rooms':
          // 同步房间到云端
          console.log('SyncManager: 房间同步到云端 - 目前不支持');
          break;
        case 'groups':
          // 同步分组到云端
          console.log('SyncManager: 分组同步到云端 - 目前不支持');
          break;
        case 'scenes':
          // 同步情景到云端
          console.log('SyncManager: 情景同步到云端 - 目前不支持');
          break;
        case 'automations':
          // 同步自动化到云端
          console.log('SyncManager: 自动化同步到云端 - 目前不支持');
          break;
        default:
          console.log(`SyncManager: 未支持的数据类型 - ${type}`);
      }
    } catch (error) {
      console.error(`SyncManager: 从本地同步到云端失败 - ${type}`, error);
      throw error;
    }
  }
  
  /**
   * 从云端同步到本地
   * @param {string} type - 数据类型
   * @param {Array} cloudData - 云端数据
   * @returns {Promise<void>}
   */
  async syncLocalFromCloud(type, cloudData) {
    console.log(`SyncManager: 从云端同步到本地 - ${type}`, cloudData.length);
    
    try {
      // 根据数据类型执行不同的同步逻辑
      switch (type) {
        case 'devices':
          // 同步云端设备到本地
          this.syncCloudDevicesToLocal(cloudData);
          break;
        case 'rooms':
          // 同步云端房间到本地
          this.syncCloudRoomsToLocal(cloudData);
          break;
        case 'groups':
          // 同步云端分组到本地
          this.syncCloudGroupsToLocal(cloudData);
          break;
        case 'scenes':
          // 同步云端情景到本地
          this.syncCloudScenesToLocal(cloudData);
          break;
        case 'automations':
          // 同步云端自动化到本地
          this.syncCloudAutomationsToLocal(cloudData);
          break;
        default:
          console.log(`SyncManager: 未支持的数据类型 - ${type}`);
      }
    } catch (error) {
      console.error(`SyncManager: 从云端同步到本地失败 - ${type}`, error);
      throw error;
    }
  }
  
  /**
   * 同步云端设备到本地
   * @param {Array} cloudDevices - 云端设备列表
   */
  syncCloudDevicesToLocal(cloudDevices) {
    // 目前本地设备管理和云端设备管理是分开的
    // 我们可以将云端设备信息合并到本地设备信息中，或者提供切换选项
    console.log(`SyncManager: 同步 ${cloudDevices.length} 个云端设备到本地`);
    this.emit('cloudDevicesSynced', cloudDevices);
  }
  
  /**
   * 同步云端房间到本地
   * @param {Array} cloudRooms - 云端房间列表
   */
  syncCloudRoomsToLocal(cloudRooms) {
    console.log(`SyncManager: 同步 ${cloudRooms.length} 个云端房间到本地`);
    this.emit('cloudRoomsSynced', cloudRooms);
  }
  
  /**
   * 同步云端分组到本地
   * @param {Array} cloudGroups - 云端分组列表
   */
  syncCloudGroupsToLocal(cloudGroups) {
    console.log(`SyncManager: 同步 ${cloudGroups.length} 个云端分组到本地`);
    this.emit('cloudGroupsSynced', cloudGroups);
  }
  
  /**
   * 同步云端情景到本地
   * @param {Array} cloudScenes - 云端情景列表
   */
  syncCloudScenesToLocal(cloudScenes) {
    console.log(`SyncManager: 同步 ${cloudScenes.length} 个云端情景到本地`);
    this.emit('cloudScenesSynced', cloudScenes);
  }
  
  /**
   * 同步云端自动化到本地
   * @param {Array} cloudAutomations - 云端自动化列表
   */
  syncCloudAutomationsToLocal(cloudAutomations) {
    console.log(`SyncManager: 同步 ${cloudAutomations.length} 个云端自动化到本地`);
    this.emit('cloudAutomationsSynced', cloudAutomations);
  }
  
  /**
   * 手动触发同步
   * @param {Array} syncTypes - 需要同步的数据类型，默认为所有配置的类型
   * @returns {Promise<void>}
   */
  async syncNow(syncTypes = this.syncConfig.syncTypes) {
    console.log(`SyncManager: 手动触发同步 - ${syncTypes.join(', ')}`);
    this.emit('syncStarted', syncTypes);
    
    try {
      // 同步设备
      if (syncTypes.includes('devices')) {
        await this.cloudDeviceManager.syncDevices();
      }
      
      // 同步房间
      if (syncTypes.includes('rooms')) {
        await this.cloudRoomManager.syncRooms();
      }
      
      // 同步分组
      if (syncTypes.includes('groups')) {
        await this.cloudGroupManager.syncGroups();
      }
      
      // 同步情景
      if (syncTypes.includes('scenes')) {
        await this.cloudSceneManager.syncScenes();
      }
      
      // 同步自动化
      if (syncTypes.includes('automations')) {
        await this.cloudAutomationManager.syncAutomations();
      }
      
      this.emit('syncFinished', syncTypes);
    } catch (error) {
      console.error('SyncManager: 手动同步失败:', error);
      this.emit('syncError', { type: 'manual', syncTypes }, error);
      throw error;
    }
  }
  
  /**
   * 启动自动同步
   */
  startAutoSync() {
    if (this.autoSyncTimer) {
      this.stopAutoSync();
    }
    
    this.autoSyncTimer = setInterval(() => {
      this.syncNow();
    }, this.syncConfig.syncInterval);
    
    console.log(`SyncManager: 自动同步已启动，间隔 ${this.syncConfig.syncInterval}ms`);
  }
  
  /**
   * 停止自动同步
   */
  stopAutoSync() {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
      this.autoSyncTimer = null;
      console.log('SyncManager: 自动同步已停止');
    }
  }
  
  /**
   * 设置同步配置
   * @param {Object} config - 同步配置
   */
  setSyncConfig(config) {
    this.syncConfig = { ...this.syncConfig, ...config };
    
    // 如果修改了autoSync配置，重新启动或停止自动同步
    if (this.syncConfig.autoSync && !this.autoSyncTimer) {
      this.startAutoSync();
    } else if (!this.syncConfig.autoSync && this.autoSyncTimer) {
      this.stopAutoSync();
    } else if (this.syncConfig.autoSync && this.autoSyncTimer) {
      // 如果修改了同步间隔，重新启动自动同步
      this.startAutoSync();
    }
    
    console.log('SyncManager: 同步配置已更新:', this.syncConfig);
  }
  
  /**
   * 获取同步配置
   * @returns {Object} 同步配置
   */
  getSyncConfig() {
    return this.syncConfig;
  }
  
  /**
   * 获取同步状态
   * @returns {Object} 同步状态
   */
  getSyncStatus() {
    return {
      isSyncing: this.isSyncing,
      queueLength: this.syncQueue.length,
      lastSyncTime: this.syncHistory.length > 0 ? this.syncHistory[this.syncHistory.length - 1].processedAt : null,
      syncHistory: this.syncHistory.slice(-10), // 返回最近10条同步记录
      autoSyncEnabled: this.syncConfig.autoSync,
      autoSyncInterval: this.syncConfig.syncInterval
    };
  }
  
  /**
   * 清理资源
   */
  cleanup() {
    this.stopAutoSync();
    this.syncQueue = [];
    console.log('SyncManager: 资源已清理');
  }
}

module.exports = SyncManager;
