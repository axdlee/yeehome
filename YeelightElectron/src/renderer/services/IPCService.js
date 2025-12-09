// IPC服务，用于与主进程通信
const { ipcRenderer } = window.electron

class IPCService {
  constructor() {
    this.callbacks = {}
    
    // 监听设备添加事件
    ipcRenderer.on('device-added', (device) => {
      console.log('渲染进程收到设备添加事件:', device)
      if (this.callbacks['deviceAdded']) {
        this.callbacks['deviceAdded'](device)
      }
    })
    
    // 监听设备发现完成事件
    ipcRenderer.on('discover-done', (devices) => {
      console.log('渲染进程收到设备发现完成事件:', devices)
      if (this.callbacks['discoverDone']) {
        this.callbacks['discoverDone'](devices)
      }
    })
    
    // 监听设备更新事件
    ipcRenderer.on('device-updated', (device) => {
      console.log('渲染进程收到设备更新事件:', device)
      if (this.callbacks['deviceUpdated']) {
        this.callbacks['deviceUpdated'](device)
      }
    })
    
    // 监听情景应用事件
    ipcRenderer.on('scene-applied', (sceneId, actions) => {
      console.log('渲染进程收到情景应用事件:', sceneId, actions)
      if (this.callbacks['sceneApplied']) {
        this.callbacks['sceneApplied'](sceneId, actions)
      }
    })
    
    // 监听设备情景列表接收事件
    ipcRenderer.on('scenes-received', (deviceId, scenes) => {
      console.log('渲染进程收到设备情景列表:', deviceId, scenes)
      if (this.callbacks['scenesReceived']) {
        this.callbacks['scenesReceived'](deviceId, scenes)
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
}

export default new IPCService()
