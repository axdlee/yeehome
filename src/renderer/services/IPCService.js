// IPC服务，用于与主进程通信
const { ipcRenderer } = window.electron

// 事件映射，用于将主进程事件名称映射到回调方法名称
const eventMap = {
  // 本地设备事件
  'device-added': 'deviceAdded',
  'discover-done': 'discoverDone',
  'device-updated': 'deviceUpdated',
  'scene-applied': 'sceneApplied',
  'scenes-received': 'scenesReceived',
  // 云设备事件
  'cloud-devices-synced': 'cloudDevicesSynced',
  'cloud-device-updated': 'cloudDeviceUpdated',
  'cloud-sync-error': 'cloudSyncError',
  'cloud-auth-error': 'cloudAuthError',
  // 云房间事件
  'cloud-rooms-synced': 'cloudRoomsSynced',
  // 云分组事件
  'cloud-groups-synced': 'cloudGroupsSynced',
  // 云情景事件
  'cloud-scenes-synced': 'cloudScenesSynced',
  'cloud-scene-executed': 'cloudSceneExecuted',
  // 云自动化事件
  'cloud-automations-synced': 'cloudAutomationsSynced',
  // 云认证事件
  'cloud-authenticated': 'cloudAuthenticated',
  'cloud-token-refreshed': 'cloudTokenRefreshed',
  'cloud-logout': 'cloudLogout',
  // OAuth回调事件
  'oauth-callback': 'oauthCallback'
}

class IPCService {
  constructor() {
    this.callbacks = {}
    this.eventListeners = new Map() // 用于存储事件监听器，便于移除
    
    // 注册全局事件监听器
    this.registerGlobalEventListeners()
  }
  
  // 注册全局事件监听器
  registerGlobalEventListeners() {
    // 遍历事件映射，注册事件监听器
    Object.entries(eventMap).forEach(([channel, callbackName]) => {
      // 创建事件处理函数
      const listener = (...args) => {
        console.log(`渲染进程收到${channel}事件:`, ...args)
        // 调用对应的回调函数
        if (this.callbacks[callbackName]) {
          this.callbacks[callbackName](...args)
        }
      }
      
      // 注册事件监听器
      ipcRenderer.on(channel, listener)
      
      // 存储事件监听器，便于后续移除
      this.eventListeners.set(channel, listener)
    })
  }
  
  // 移除全局事件监听器
  removeGlobalEventListeners() {
    // 遍历事件监听器映射，移除所有事件监听器
    this.eventListeners.forEach((listener, channel) => {
      ipcRenderer.removeListener(channel, listener)
    })
    
    // 清空事件监听器映射
    this.eventListeners.clear()
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
  
  // 销毁IPCService实例，用于清理资源
  destroy() {
    // 移除所有事件回调
    this.callbacks = {}
    // 移除所有事件监听器
    this.removeGlobalEventListeners()
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
