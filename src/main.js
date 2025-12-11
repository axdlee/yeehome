const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const YeelightService = require('./services/YeelightService')
const CloudDeviceManager = require('./services/CloudDeviceManager')
const CloudRoomManager = require('./services/CloudRoomManager')
const CloudGroupManager = require('./services/CloudGroupManager')
const CloudSceneManager = require('./services/CloudSceneManager')
const CloudAutomationManager = require('./services/CloudAutomationManager')
const SyncManager = require('./services/SyncManager')

// 创建Yeelight服务实例
const yeelightService = new YeelightService()

// 创建ConfigManager实例用于配置管理
const ConfigManager = require('./services/ConfigManager')
const configManager = new ConfigManager()

// 创建云服务实例
const cloudDeviceManager = new CloudDeviceManager()
const cloudRoomManager = new CloudRoomManager()
const cloudGroupManager = new CloudGroupManager()
const cloudSceneManager = new CloudSceneManager()
const cloudAutomationManager = new CloudAutomationManager()

// 初始化云服务配置
const cloudConfig = configManager.getConfig('cloudService', {})
const oauthConfig = configManager.getConfig('oauth', {})

// 为每个云服务实例设置API基础URL和OAuth配置
const cloudServices = [cloudDeviceManager, cloudRoomManager, cloudGroupManager, cloudSceneManager, cloudAutomationManager]
cloudServices.forEach(service => {
  if (service.setApiBaseUrl) {
    service.setApiBaseUrl(cloudConfig.apiBaseUrl || '')
  }
  if (service.setOAuthConfig) {
    service.setOAuthConfig(oauthConfig)
  }
})

// 创建同步管理器实例
const syncManager = new SyncManager(
  yeelightService,
  cloudDeviceManager,
  cloudRoomManager,
  cloudGroupManager,
  cloudSceneManager,
  cloudAutomationManager
)

// 监听云设备管理器的事件
cloudDeviceManager.on('devicesSynced', (devices) => {
  console.log('主进程接收到云端设备同步完成事件:', devices)
  // 发送事件到所有窗口
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send('cloud-devices-synced', devices)
  })
})

cloudDeviceManager.on('deviceUpdated', (device) => {
  console.log('主进程接收到云端设备更新事件:', device)
  // 发送事件到所有窗口
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send('cloud-device-updated', device)
  })
})

cloudDeviceManager.on('syncError', (error) => {
  console.error('主进程接收到云端设备同步错误事件:', error)
  // 发送事件到所有窗口
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send('cloud-sync-error', error)
  })
})

cloudDeviceManager.on('authError', (error) => {
  console.error('主进程接收到云端认证错误事件:', error)
  // 发送事件到所有窗口
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send('cloud-auth-error', error)
  })
})

// 监听云房间管理器的事件
cloudRoomManager.on('roomsSynced', (rooms) => {
  console.log('主进程接收到云端房间同步完成事件:', rooms)
  // 发送事件到所有窗口
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send('cloud-rooms-synced', rooms)
  })
})

// 监听云分组管理器的事件
cloudGroupManager.on('groupsSynced', (groups) => {
  console.log('主进程接收到云端分组同步完成事件:', groups)
  // 发送事件到所有窗口
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send('cloud-groups-synced', groups)
  })
})

// 监听云情景管理器的事件
cloudSceneManager.on('scenesSynced', (scenes) => {
  console.log('主进程接收到云端情景同步完成事件:', scenes)
  // 发送事件到所有窗口
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send('cloud-scenes-synced', scenes)
  })
})

cloudSceneManager.on('sceneExecuted', (sceneId, result) => {
  console.log('主进程接收到云端情景执行事件:', sceneId, result)
  // 发送事件到所有窗口
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send('cloud-scene-executed', sceneId, result)
  })
})

// 监听云自动化管理器的事件
cloudAutomationManager.on('automationsSynced', (automations) => {
  console.log('主进程接收到云端自动化同步完成事件:', automations)
  // 发送事件到所有窗口
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send('cloud-automations-synced', automations)
  })
})

// 监听认证相关事件 - 改为直接监听cloudService事件
// 认证相关事件已通过cloudDeviceManager.oauthManager的emit触发到cloudService，再由cloudService触发到cloudDeviceManager
// 所以我们直接监听cloudDeviceManager的事件即可
cloudDeviceManager.on('authenticated', (tokens) => {
  console.log('主进程接收到云端认证成功事件:', tokens)
  // 发送事件到所有窗口
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send('cloud-authenticated', tokens)
  })
})

cloudDeviceManager.on('tokenRefreshed', (tokens) => {
  console.log('主进程接收到云端token刷新成功事件:', tokens)
  // 发送事件到所有窗口
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send('cloud-token-refreshed', tokens)
  })
})

cloudDeviceManager.on('logout', () => {
  console.log('主进程接收到云端登出事件')
  // 发送事件到所有窗口
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send('cloud-logout')
  })
})

// 监听Yeelight服务的设备添加事件
yeelightService.on('deviceAdded', (device) => {
  console.log('主进程接收到设备添加事件:', device)
  // 发送事件到所有窗口
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send('device-added', device)
  })
})

// 监听Yeelight服务的设备发现完成事件
yeelightService.on('discoverDone', (devices) => {
  console.log('主进程接收到设备发现完成事件:', devices)
  // 发送事件到所有窗口
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send('discover-done', devices)
  })
})

// 监听Yeelight服务的设备更新事件
yeelightService.on('deviceUpdated', (device) => {
  console.log('主进程接收到设备更新事件:', device)
  // 发送事件到所有窗口
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send('device-updated', device)
  })
})

// 监听Yeelight服务的情景应用事件
yeelightService.on('sceneApplied', (sceneId, actions) => {
  console.log('主进程接收到情景应用事件:', sceneId, actions)
  // 发送事件到所有窗口
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send('scene-applied', sceneId, actions)
  })
})

// 监听Yeelight服务的情景列表接收事件
yeelightService.on('scenesReceived', (deviceId, scenes) => {
  console.log('主进程接收到设备情景列表:', deviceId, scenes)
  // 发送事件到所有窗口
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send('scenes-received', deviceId, scenes)
  })
})

// 创建窗口时添加关闭事件监听
function createWindow () {
  // 创建浏览器窗口
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // 加载index.html
  const indexPath = path.join(__dirname, '../dist/index.html');
  console.log('加载HTML文件:', indexPath);
  win.loadFile(indexPath)
    .then(() => {
      console.log('HTML文件加载成功');
    })
    .catch((error) => {
      console.error('HTML文件加载失败:', error);
    })

  // 仅在开发模式下打开开发者工具
  if (process.env.NODE_ENV === 'development') {
    win.webContents.openDevTools()
  }
  
  // 监听窗口关闭事件
  win.on('close', (event) => {
    console.log('窗口关闭事件触发');
    // 可以在这里添加确认关闭的逻辑
    // 如果需要阻止关闭，可以使用 event.preventDefault()
  })
  
  // 监听窗口关闭事件，确保资源被正确释放
  win.on('closed', () => {
    console.log('窗口已关闭');
    // 清理窗口相关资源
  })
}

// 当Electron完成初始化并准备创建浏览器窗口时调用
app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    // 在macOS上，当点击dock图标并且没有其他窗口打开时，通常会重新创建一个窗口
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// 在所有窗口关闭时退出应用
app.on('window-all-closed', () => {
  // 修改：在所有平台上，当所有窗口关闭时都退出应用
  app.quit()
})

// 监听窗口关闭事件
app.on('before-quit', () => {
  // 清理资源
  console.log('应用即将退出，清理资源...')
  // 关闭所有设备连接
  yeelightService.cleanup()
  
  // 关闭OAuth回调服务器
  if (oauthServer) {
    oauthServer.close(() => {
      console.log('OAuth回调服务器已关闭')
    })
  }
})

// 添加OAuth回调服务器
let oauthServer = null

// 初始化OAuth回调服务器
function initOAuthCallbackServer() {
  const http = require('http')
  const url = require('url')
  
  // 创建HTTP服务器
  oauthServer = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true)
    
    // 检查是否是OAuth回调请求
    if (parsedUrl.pathname === '/callback') {
      const code = parsedUrl.query.code
      const state = parsedUrl.query.state
      
      if (code) {
        console.log('收到OAuth授权码:', code)
        console.log('state:', state)
        
        // 发送事件到渲染进程
        BrowserWindow.getAllWindows().forEach((window) => {
          window.webContents.send('oauth-callback', { code, state })
        })
        
        // 返回成功响应给浏览器
        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end('<html><body><h1>认证成功！</h1><p>您可以关闭此窗口返回应用。</p></body></html>')
      } else {
        // 返回错误响应
        res.writeHead(400, { 'Content-Type': 'text/html' })
        res.end('<html><body><h1>认证失败！</h1><p>缺少授权码。</p></body></html>')
      }
    } else {
      // 返回404
      res.writeHead(404, { 'Content-Type': 'text/html' })
      res.end('<html><body><h1>404 Not Found</h1></body></html>')
    }
  })
  
  // 启动服务器，监听3000端口
  oauthServer.listen(3000, () => {
    console.log('OAuth回调服务器已启动，监听端口3000')
  })
}

// 在应用启动时初始化OAuth回调服务器
app.whenReady().then(() => {
  initOAuthCallbackServer()
})

// IPC事件处理
ipcMain.handle('discover-devices', (event) => {
  yeelightService.discoverDevices()
  return true
})

ipcMain.handle('get-devices', (event) => {
  return yeelightService.getDevices()
})

ipcMain.handle('toggle-power', (event, deviceId, power) => {
  return yeelightService.togglePower(deviceId, power)
})

ipcMain.handle('set-brightness', (event, deviceId, brightness) => {
  return yeelightService.setBrightness(deviceId, brightness)
})

ipcMain.handle('set-color-temperature', (event, deviceId, colorTemperature) => {
  return yeelightService.setColorTemperature(deviceId, colorTemperature)
})

ipcMain.handle('set-color', (event, deviceId, rgb) => {
  return yeelightService.setColor(deviceId, rgb)
})

ipcMain.handle('get-scenes-from-device', (event, deviceId) => {
  yeelightService.getScenesFromDevice(deviceId)
  return true
})

ipcMain.handle('get-groups-from-device', (event, deviceId) => {
  yeelightService.getGroupsFromDevice(deviceId)
  return true
})

ipcMain.handle('toggle-device', (event, deviceId) => {
  return yeelightService.toggle(deviceId)
})

ipcMain.handle('set-scene', (event, deviceId, sceneType, params) => {
  return yeelightService.setScene(deviceId, sceneType, params)
})

ipcMain.handle('set-default', (event, deviceId) => {
  return yeelightService.setDefault(deviceId)
})

// 云服务相关的IPC事件处理

// 认证相关
ipcMain.handle('cloud-get-authorization-url', (event, state) => {
  return cloudDeviceManager.getAuthorizationUrl(state)
})

ipcMain.handle('cloud-get-access-token', (event, code) => {
  return cloudDeviceManager.getAccessToken(code)
})

ipcMain.handle('cloud-is-authenticated', (event) => {
  return cloudDeviceManager.isAuthenticated()
})

ipcMain.handle('cloud-get-auth-status', (event) => {
  return cloudDeviceManager.getAuthStatus()
})

ipcMain.handle('cloud-logout', (event) => {
  return cloudDeviceManager.logout()
})

// 设备相关
ipcMain.handle('cloud-sync-devices', (event) => {
  return cloudDeviceManager.syncDevices()
})

ipcMain.handle('cloud-get-devices', (event) => {
  return cloudDeviceManager.getDevices()
})

ipcMain.handle('cloud-get-device', (event, deviceId) => {
  return cloudDeviceManager.getDevice(deviceId)
})

ipcMain.handle('cloud-query-devices', (event, deviceIds) => {
  return cloudDeviceManager.queryDevices(deviceIds)
})

ipcMain.handle('cloud-control-device', (event, deviceId, executions) => {
  return cloudDeviceManager.controlDevice(deviceId, executions)
})

ipcMain.handle('cloud-toggle-power', (event, deviceId, power) => {
  return cloudDeviceManager.togglePower(deviceId, power)
})

ipcMain.handle('cloud-set-brightness', (event, deviceId, brightness) => {
  return cloudDeviceManager.setBrightness(deviceId, brightness)
})

ipcMain.handle('cloud-set-color-temperature', (event, deviceId, colorTemperature) => {
  return cloudDeviceManager.setColorTemperature(deviceId, colorTemperature)
})

ipcMain.handle('cloud-set-color', (event, deviceId, rgb) => {
  return cloudDeviceManager.setColor(deviceId, rgb)
})

// 房间相关
ipcMain.handle('cloud-sync-rooms', (event) => {
  return cloudRoomManager.syncRooms()
})

ipcMain.handle('cloud-get-rooms', (event) => {
  return cloudRoomManager.getRooms()
})

ipcMain.handle('cloud-get-room', (event, roomId) => {
  return cloudRoomManager.getRoom(roomId)
})

// 分组相关
ipcMain.handle('cloud-sync-groups', (event) => {
  return cloudGroupManager.syncGroups()
})

ipcMain.handle('cloud-get-groups', (event) => {
  return cloudGroupManager.getGroups()
})

ipcMain.handle('cloud-get-group', (event, groupId) => {
  return cloudGroupManager.getGroup(groupId)
})

ipcMain.handle('cloud-control-group', (event, groupId, executions) => {
  return cloudGroupManager.controlGroup(groupId, executions)
})

ipcMain.handle('cloud-toggle-group-power', (event, groupId, power) => {
  return cloudGroupManager.toggleGroupPower(groupId, power)
})

// 情景相关
ipcMain.handle('cloud-sync-scenes', (event) => {
  return cloudSceneManager.syncScenes()
})

ipcMain.handle('cloud-get-scenes', (event) => {
  return cloudSceneManager.getScenes()
})

ipcMain.handle('cloud-get-scene', (event, sceneId) => {
  return cloudSceneManager.getScene(sceneId)
})

ipcMain.handle('cloud-execute-scene', (event, sceneId) => {
  return cloudSceneManager.executeScene(sceneId)
})

// 自动化相关
ipcMain.handle('cloud-sync-automations', (event) => {
  return cloudAutomationManager.syncAutomations()
})

ipcMain.handle('cloud-get-automations', (event) => {
  return cloudAutomationManager.getAutomations()
})

ipcMain.handle('cloud-get-automation', (event, automationId) => {
  return cloudAutomationManager.getAutomation(automationId)
})

ipcMain.handle('cloud-enable-automation', (event, automationId) => {
  return cloudAutomationManager.enableAutomation(automationId)
})

ipcMain.handle('cloud-disable-automation', (event, automationId) => {
  return cloudAutomationManager.disableAutomation(automationId)
})

// 同步相关
ipcMain.handle('cloud-sync-now', (event, syncTypes) => {
  return syncManager.syncNow(syncTypes)
})

ipcMain.handle('cloud-get-sync-status', (event) => {
  return syncManager.getSyncStatus()
})

ipcMain.handle('cloud-set-sync-config', (event, config) => {
  return syncManager.setSyncConfig(config)
})

ipcMain.handle('cloud-get-sync-config', (event) => {
  return syncManager.getSyncConfig()
})

