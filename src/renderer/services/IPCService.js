// IPC服务，用于与主进程通信
const { ipcRenderer } = window.electron

class IPCService {
  constructor() {
    this.callbacks = {}
    
    // 本地设备相关事件
    ipcRenderer.on('device-added', (device) => {
      console.log('渲染进程收到设备添加事件:', device)
      if (this.callbacks['deviceAdded']) {
        this.callbacks['deviceAdded'](device)
      }
    })
    
    ipcRenderer.on('discover-done', (devices) => {
      console.log('渲染进程收到设备发现完成事件:', devices)
      if (this.callbacks['discoverDone']) {
        this.callbacks['discoverDone'](devices)
      }
    })
    
    ipcRenderer.on('device-updated', (device) => {
      console.log('渲染进程收到设备更新事件:', device)
      if (this.callbacks['deviceUpdated']) {
        this.callbacks['deviceUpdated'](device)
      }
    })
    
    ipcRenderer.on('scene-applied', (sceneId, actions) => {
      console.log('渲染进程收到情景应用事件:', sceneId, actions)
      if (this.callbacks['sceneApplied']) {
        this.callbacks['sceneApplied'](sceneId, actions)
      }
    })
    
    ipcRenderer.on('scenes-received', (deviceId, scenes) => {
      console.log('渲染进程收到设备情景列表:', deviceId, scenes)
      if (this.callbacks['scenesReceived']) {
        this.callbacks['scenesReceived'](deviceId, scenes)
      }
    })
    
    // 云设备相关事件
    ipcRenderer.on('cloud-devices-synced', (devices) => {
      console.log('渲染进程收到云端设备同步完成事件:', devices)
      if (this.callbacks['cloudDevicesSynced']) {
        this.callbacks['cloudDevicesSynced'](devices)
      }
    })
    
    ipcRenderer.on('cloud-device-updated', (device) => {
      console.log('渲染进程收到云端设备更新事件:', device)
      if (this.callbacks['cloudDeviceUpdated']) {
        this.callbacks['cloudDeviceUpdated'](device)
      }
    })
    
    ipcRenderer.on('cloud-sync-error', (error) => {
      console.error('渲染进程收到云端同步错误事件:', error)
      if (this.callbacks['cloudSyncError']) {
        this.callbacks['cloudSyncError'](error)
      }
    })
    
    ipcRenderer.on('cloud-auth-error', (error) => {
      console.error('渲染进程收到云端认证错误事件:', error)
      if (this.callbacks['cloudAuthError']) {
        this.callbacks['cloudAuthError'](error)
      }
    })
    
    // 云房间相关事件
    ipcRenderer.on('cloud-rooms-synced', (rooms) => {
      console.log('渲染进程收到云端房间同步完成事件:', rooms)
      if (this.callbacks['cloudRoomsSynced']) {
        this.callbacks['cloudRoomsSynced'](rooms)
      }
    })
    
    // 云分组相关事件
    ipcRenderer.on('cloud-groups-synced', (groups) => {
      console.log('渲染进程收到云端分组同步完成事件:', groups)
      if (this.callbacks['cloudGroupsSynced']) {
        this.callbacks['cloudGroupsSynced'](groups)
      }
    })
    
    // 云情景相关事件
    ipcRenderer.on('cloud-scenes-synced', (scenes) => {
      console.log('渲染进程收到云端情景同步完成事件:', scenes)
      if (this.callbacks['cloudScenesSynced']) {
        this.callbacks['cloudScenesSynced'](scenes)
      }
    })
    
    ipcRenderer.on('cloud-scene-executed', (sceneId, result) => {
      console.log('渲染进程收到云端情景执行事件:', sceneId, result)
      if (this.callbacks['cloudSceneExecuted']) {
        this.callbacks['cloudSceneExecuted'](sceneId, result)
      }
    })
    
    // 云自动化相关事件
    ipcRenderer.on('cloud-automations-synced', (automations) => {
      console.log('渲染进程收到云端自动化同步完成事件:', automations)
      if (this.callbacks['cloudAutomationsSynced']) {
        this.callbacks['cloudAutomationsSynced'](automations)
      }
    })
    
    // 云认证相关事件
    ipcRenderer.on('cloud-authenticated', (tokens) => {
      console.log('渲染进程收到云端认证成功事件:', tokens)
      if (this.callbacks['cloudAuthenticated']) {
        this.callbacks['cloudAuthenticated'](tokens)
      }
    })
    
    ipcRenderer.on('cloud-token-refreshed', (tokens) => {
      console.log('渲染进程收到云端token刷新成功事件:', tokens)
      if (this.callbacks['cloudTokenRefreshed']) {
        this.callbacks['cloudTokenRefreshed'](tokens)
      }
    })
    
    ipcRenderer.on('cloud-logout', () => {
      console.log('渲染进程收到云端登出事件')
      if (this.callbacks['cloudLogout']) {
        this.callbacks['cloudLogout']()
      }
    })
  }
  
  // 注册事件回调
  on(event, callback) {
    this.callbacks[event] = callback
  }
  
  // 移除事件回调
  off(event) {
    if (this.callbacks[event]) {
      delete this.callbacks[event]
    }
  }
  
  // 发现设备
  async discoverDevices() {
    return await ipcRenderer.invoke('discover-devices')
  }
  
  // 获取所有设备
  async getDevices() {
    return await ipcRenderer.invoke('get-devices')
  }
  
  // 控制设备电源
  async togglePower(deviceId, power) {
    return await ipcRenderer.invoke('toggle-power', deviceId, power)
  }
  
  // 设置亮度
  async setBrightness(deviceId, brightness) {
    return await ipcRenderer.invoke('set-brightness', deviceId, brightness)
  }
  
  // 设置色温
  async setColorTemperature(deviceId, colorTemperature) {
    return await ipcRenderer.invoke('set-color-temperature', deviceId, colorTemperature)
  }
  
  // 设置颜色
  async setColor(deviceId, rgb) {
    return await ipcRenderer.invoke('set-color', deviceId, rgb)
  }
  
  // 从设备读取情景列表
  async getScenesFromDevice(deviceId) {
    return await ipcRenderer.invoke('get-scenes-from-device', deviceId)
  }
  
  // 从设备读取灯组列表
  async getGroupsFromDevice(deviceId) {
    return await ipcRenderer.invoke('get-groups-from-device', deviceId)
  }
  
  // 切换设备电源状态
  async toggleDevice(deviceId) {
    return await ipcRenderer.invoke('toggle-device', deviceId)
  }
  
  // 设置设备情景
  async setScene(deviceId, sceneType, params) {
    return await ipcRenderer.invoke('set-scene', deviceId, sceneType, params)
  }
  
  // 设置设备默认状态
  async setDefault(deviceId) {
    return await ipcRenderer.invoke('set-default', deviceId)
  }
  
  // 云服务相关方法
  
  // 认证相关
  async getAuthorizationUrl(state) {
    return await ipcRenderer.invoke('cloud-get-authorization-url', state)
  }
  
  async getAccessToken(code) {
    return await ipcRenderer.invoke('cloud-get-access-token', code)
  }
  
  async isAuthenticated() {
    return await ipcRenderer.invoke('cloud-is-authenticated')
  }
  
  async getAuthStatus() {
    return await ipcRenderer.invoke('cloud-get-auth-status')
  }
  
  async logout() {
    return await ipcRenderer.invoke('cloud-logout')
  }
  
  // 设备相关
  async cloudSyncDevices() {
    return await ipcRenderer.invoke('cloud-sync-devices')
  }
  
  async cloudGetDevices() {
    return await ipcRenderer.invoke('cloud-get-devices')
  }
  
  async cloudGetDevice(deviceId) {
    return await ipcRenderer.invoke('cloud-get-device', deviceId)
  }
  
  async cloudQueryDevices(deviceIds) {
    return await ipcRenderer.invoke('cloud-query-devices', deviceIds)
  }
  
  async cloudControlDevice(deviceId, executions) {
    return await ipcRenderer.invoke('cloud-control-device', deviceId, executions)
  }
  
  async cloudTogglePower(deviceId, power) {
    return await ipcRenderer.invoke('cloud-toggle-power', deviceId, power)
  }
  
  async cloudSetBrightness(deviceId, brightness) {
    return await ipcRenderer.invoke('cloud-set-brightness', deviceId, brightness)
  }
  
  async cloudSetColorTemperature(deviceId, colorTemperature) {
    return await ipcRenderer.invoke('cloud-set-color-temperature', deviceId, colorTemperature)
  }
  
  async cloudSetColor(deviceId, rgb) {
    return await ipcRenderer.invoke('cloud-set-color', deviceId, rgb)
  }
  
  // 房间相关
  async cloudSyncRooms() {
    return await ipcRenderer.invoke('cloud-sync-rooms')
  }
  
  async cloudGetRooms() {
    return await ipcRenderer.invoke('cloud-get-rooms')
  }
  
  async cloudGetRoom(roomId) {
    return await ipcRenderer.invoke('cloud-get-room', roomId)
  }
  
  // 分组相关
  async cloudSyncGroups() {
    return await ipcRenderer.invoke('cloud-sync-groups')
  }
  
  async cloudGetGroups() {
    return await ipcRenderer.invoke('cloud-get-groups')
  }
  
  async cloudGetGroup(groupId) {
    return await ipcRenderer.invoke('cloud-get-group', groupId)
  }
  
  async cloudControlGroup(groupId, executions) {
    return await ipcRenderer.invoke('cloud-control-group', groupId, executions)
  }
  
  async cloudToggleGroupPower(groupId, power) {
    return await ipcRenderer.invoke('cloud-toggle-group-power', groupId, power)
  }
  
  // 情景相关
  async cloudSyncScenes() {
    return await ipcRenderer.invoke('cloud-sync-scenes')
  }
  
  async cloudGetScenes() {
    return await ipcRenderer.invoke('cloud-get-scenes')
  }
  
  async cloudGetScene(sceneId) {
    return await ipcRenderer.invoke('cloud-get-scene', sceneId)
  }
  
  async cloudExecuteScene(sceneId) {
    return await ipcRenderer.invoke('cloud-execute-scene', sceneId)
  }
  
  // 自动化相关
  async cloudSyncAutomations() {
    return await ipcRenderer.invoke('cloud-sync-automations')
  }
  
  async cloudGetAutomations() {
    return await ipcRenderer.invoke('cloud-get-automations')
  }
  
  async cloudGetAutomation(automationId) {
    return await ipcRenderer.invoke('cloud-get-automation', automationId)
  }
  
  async cloudEnableAutomation(automationId) {
    return await ipcRenderer.invoke('cloud-enable-automation', automationId)
  }
  
  async cloudDisableAutomation(automationId) {
    return await ipcRenderer.invoke('cloud-disable-automation', automationId)
  }
  
  // 同步相关
  async cloudSyncNow(syncTypes) {
    return await ipcRenderer.invoke('cloud-sync-now', syncTypes)
  }
  
  async cloudGetSyncStatus() {
    return await ipcRenderer.invoke('cloud-get-sync-status')
  }
  
  async cloudSetSyncConfig(config) {
    return await ipcRenderer.invoke('cloud-set-sync-config', config)
  }
  
  async cloudGetSyncConfig() {
    return await ipcRenderer.invoke('cloud-get-sync-config')
  }
}

export default new IPCService()
