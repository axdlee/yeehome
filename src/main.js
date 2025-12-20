const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const YeelightService = require('./services/YeelightService')
const CloudDeviceManager = require('./services/CloudDeviceManager')
const CloudRoomManager = require('./services/CloudRoomManager')
const CloudGroupManager = require('./services/CloudGroupManager')
const CloudSceneManager = require('./services/CloudSceneManager')
const CloudAutomationManager = require('./services/CloudAutomationManager')
const SyncManager = require('./services/SyncManager')
const EventManager = require('./services/core/EventManager')
const LogSanitizer = require('./services/security/LogSanitizer')
const ErrorHandler = require('./middleware/ErrorHandler')

// 创建全局 EventManager 实例
const eventManager = new EventManager()

/**
 * 通用的事件转发函数 - 将服务层事件转发到所有渲染进程窗口
 * 使用 EventManager 自动跟踪监听器
 * @param {EventEmitter} emitter - 事件发射器实例
 * @param {string} eventName - 监听的事件名称
 * @param {string} [rendererEvent] - 发送到渲染进程的事件名称(默认与eventName相同)
 * @param {Function} [logMessage] - 日志消息生成函数
 */
function forwardEventToRenderer(emitter, eventName, rendererEvent, logMessage) {
  const targetEvent = rendererEvent || eventName;

  // 使用 EventManager 注册监听器
  eventManager.on(emitter, eventName, (...args) => {
    // 记录日志（脱敏）
    if (logMessage) {
      const message = logMessage(...args);
      console.log(LogSanitizer.sanitize(message));
    }

    // 转发到所有窗口
    BrowserWindow.getAllWindows().forEach((window) => {
      window.webContents.send(targetEvent, ...args);
    });
  });
}

/**
 * 通用的错误事件转发函数
 * @param {EventEmitter} emitter - 事件发射器实例
 * @param {string} eventName - 监听的错误事件名称
 * @param {string} rendererEvent - 发送到渲染进程的事件名称
 * @param {string} errorContext - 错误上下文描述
 */
function forwardErrorEventToRenderer(emitter, eventName, rendererEvent, errorContext) {
  eventManager.on(emitter, eventName, (error) => {
    const sanitizedError = LogSanitizer.sanitize(error);
    console.error(`主进程接收到${errorContext}:`, sanitizedError);

    BrowserWindow.getAllWindows().forEach((window) => {
      window.webContents.send(rendererEvent, error);
    });
  });
}

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

// 监听云设备管理器事件
forwardEventToRenderer(
  cloudDeviceManager,
  'devicesSynced',
  'cloud-devices-synced',
  (devices) => `主进程接收到云端设备同步完成事件: ${devices.length}个设备`
);

forwardEventToRenderer(
  cloudDeviceManager,
  'deviceUpdated',
  'cloud-device-updated',
  (device) => `主进程接收到云端设备更新事件: ${device.id}`
);

forwardErrorEventToRenderer(
  cloudDeviceManager,
  'syncError',
  'cloud-sync-error',
  '云端设备同步错误事件'
);

forwardErrorEventToRenderer(
  cloudDeviceManager,
  'authError',
  'cloud-auth-error',
  '云端认证错误事件'
);

// 监听云房间管理器事件
forwardEventToRenderer(
  cloudRoomManager,
  'roomsSynced',
  'cloud-rooms-synced',
  (rooms) => `主进程接收到云端房间同步完成事件: ${rooms.length}个房间`
);

// 监听云分组管理器事件
forwardEventToRenderer(
  cloudGroupManager,
  'groupsSynced',
  'cloud-groups-synced',
  (groups) => `主进程接收到云端分组同步完成事件: ${groups.length}个分组`
);

// 监听云情景管理器事件
forwardEventToRenderer(
  cloudSceneManager,
  'scenesSynced',
  'cloud-scenes-synced',
  (scenes) => `主进程接收到云端情景同步完成事件: ${scenes.length}个情景`
);

forwardEventToRenderer(
  cloudSceneManager,
  'sceneExecuted',
  'cloud-scene-executed',
  (sceneId, result) => `主进程接收到云端情景执行事件: ${sceneId}, 结果: ${result}`
);

// 监听云自动化管理器事件
forwardEventToRenderer(
  cloudAutomationManager,
  'automationsSynced',
  'cloud-automations-synced',
  (automations) => `主进程接收到云端自动化同步完成事件: ${automations.length}个自动化`
);

// 监听认证相关事件
forwardEventToRenderer(
  cloudDeviceManager,
  'authenticated',
  'cloud-authenticated',
  () => '主进程接收到云端认证成功事件'
);

forwardEventToRenderer(
  cloudDeviceManager,
  'tokenRefreshed',
  'cloud-token-refreshed',
  () => '主进程接收到云端token刷新成功事件'
);

forwardEventToRenderer(
  cloudDeviceManager,
  'logout',
  'cloud-logout',
  () => '主进程接收到云端登出事件'
);

// 监听Yeelight服务事件
forwardEventToRenderer(
  yeelightService,
  'deviceAdded',
  'device-added',
  (device) => `主进程接收到设备添加事件: ${device.id}`
);

forwardEventToRenderer(
  yeelightService,
  'discoverDone',
  'discover-done',
  (devices) => `主进程接收到设备发现完成事件: ${devices.length}个设备`
);

forwardEventToRenderer(
  yeelightService,
  'deviceUpdated',
  'device-updated',
  (device) => `主进程接收到设备更新事件: ${device.id}`
);

forwardEventToRenderer(
  yeelightService,
  'sceneApplied',
  'scene-applied',
  (sceneId, actions) => `主进程接收到情景应用事件: ${sceneId}`
);

forwardEventToRenderer(
  yeelightService,
  'scenesReceived',
  'scenes-received',
  (deviceId, scenes) => `主进程接收到设备情景列表: ${deviceId}`
);

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

  // 清理所有事件监听器
  console.log('清理事件监听器...')
  eventManager.cleanup()

  // 关闭所有设备连接
  console.log('关闭设备连接...')
  yeelightService.cleanup()

  // 清理 OAuthManager 资源
  if (cloudDeviceManager && cloudDeviceManager.oauthManager) {
    console.log('清理 OAuth 资源...')
    cloudDeviceManager.oauthManager.cleanup()
  }

  // 关闭OAuth回调服务器
  if (oauthServer) {
    oauthServer.close(() => {
      console.log('OAuth回调服务器已关闭')
    })
  }

  console.log('资源清理完成')
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

      if (code && state) {
        // 脱敏日志输出
        console.log('收到OAuth授权码:', LogSanitizer.partialSanitize(code, 4))
        console.log('state:', LogSanitizer.partialSanitize(state, 4))

        // 发送事件到渲染进程（包含 state 用于验证）
        BrowserWindow.getAllWindows().forEach((window) => {
          window.webContents.send('oauth-callback', { code, state })
        })

        // 返回成功响应给浏览器
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end('<html><body><h1>认证成功！</h1><p>您可以关闭此窗口返回应用。</p></body></html>')
      } else {
        // 返回错误响应
        const errorMessage = !code ? '缺少授权码' : '缺少 state 参数'
        console.error('OAuth 回调错误:', errorMessage)

        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end(`<html><body><h1>认证失败！</h1><p>${errorMessage}</p></body></html>`)
      }
    } else {
      // 返回404
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' })
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

/**
 * 注册带错误处理的 IPC Handler
 * 使用 ErrorHandler.wrapIPC 统一处理所有 IPC 请求的错误
 * @param {string} channel - IPC 通道名称
 * @param {Function} handler - 处理函数
 */
function registerIPCHandler(channel, handler) {
  ipcMain.handle(channel, ErrorHandler.wrapIPC(handler, channel))
}

// IPC事件处理 - 本地设备
registerIPCHandler('discover-devices', async () => {
  yeelightService.discoverDevices()
  return { success: true }
})

registerIPCHandler('get-devices', async () => {
  return { success: true, data: yeelightService.getDevices() }
})

registerIPCHandler('toggle-power', async (event, deviceId, power) => {
  const result = yeelightService.togglePower(deviceId, power)
  return { success: true, data: result }
})

registerIPCHandler('set-brightness', async (event, deviceId, brightness) => {
  const result = yeelightService.setBrightness(deviceId, brightness)
  return { success: true, data: result }
})

registerIPCHandler('set-color-temperature', async (event, deviceId, colorTemperature) => {
  const result = yeelightService.setColorTemperature(deviceId, colorTemperature)
  return { success: true, data: result }
})

registerIPCHandler('set-color', async (event, deviceId, rgb) => {
  const result = yeelightService.setColor(deviceId, rgb)
  return { success: true, data: result }
})

registerIPCHandler('get-scenes-from-device', async (event, deviceId) => {
  yeelightService.getScenesFromDevice(deviceId)
  return { success: true }
})

registerIPCHandler('get-groups-from-device', async (event, deviceId) => {
  yeelightService.getGroupsFromDevice(deviceId)
  return { success: true }
})

registerIPCHandler('toggle-device', async (event, deviceId) => {
  const result = yeelightService.toggle(deviceId)
  return { success: true, data: result }
})

registerIPCHandler('set-scene', async (event, deviceId, sceneType, params) => {
  const result = yeelightService.setScene(deviceId, sceneType, params)
  return { success: true, data: result }
})

registerIPCHandler('set-default', async (event, deviceId) => {
  const result = yeelightService.setDefault(deviceId)
  return { success: true, data: result }
})

// 云服务相关的IPC事件处理

// 认证相关
registerIPCHandler('cloud-get-authorization-url', async (event, state) => {
  const result = await cloudDeviceManager.getAuthorizationUrl(state)
  return { success: true, data: result }
})

registerIPCHandler('cloud-get-access-token', async (event, code) => {
  const result = await cloudDeviceManager.getAccessToken(code)
  return { success: true, data: result }
})

registerIPCHandler('cloud-is-authenticated', async () => {
  const result = cloudDeviceManager.isAuthenticated()
  return { success: true, data: result }
})

registerIPCHandler('cloud-get-auth-status', async () => {
  const result = cloudDeviceManager.getAuthStatus()
  return { success: true, data: result }
})

registerIPCHandler('cloud-logout', async () => {
  await cloudDeviceManager.logout()
  return { success: true }
})

// 设备相关
registerIPCHandler('cloud-sync-devices', async () => {
  const result = await cloudDeviceManager.syncDevices()
  return { success: true, data: result }
})

registerIPCHandler('cloud-get-devices', async () => {
  const result = cloudDeviceManager.getDevices()
  return { success: true, data: result }
})

registerIPCHandler('cloud-get-device', async (event, deviceId) => {
  const result = cloudDeviceManager.getDevice(deviceId)
  return { success: true, data: result }
})

registerIPCHandler('cloud-query-devices', async (event, deviceIds) => {
  const result = await cloudDeviceManager.queryDevices(deviceIds)
  return { success: true, data: result }
})

registerIPCHandler('cloud-control-device', async (event, deviceId, executions) => {
  const result = await cloudDeviceManager.controlDevice(deviceId, executions)
  return { success: true, data: result }
})

registerIPCHandler('cloud-toggle-power', async (event, deviceId, power) => {
  const result = await cloudDeviceManager.togglePower(deviceId, power)
  return { success: true, data: result }
})

registerIPCHandler('cloud-set-brightness', async (event, deviceId, brightness) => {
  const result = await cloudDeviceManager.setBrightness(deviceId, brightness)
  return { success: true, data: result }
})

registerIPCHandler('cloud-set-color-temperature', async (event, deviceId, colorTemperature) => {
  const result = await cloudDeviceManager.setColorTemperature(deviceId, colorTemperature)
  return { success: true, data: result }
})

registerIPCHandler('cloud-set-color', async (event, deviceId, rgb) => {
  const result = await cloudDeviceManager.setColor(deviceId, rgb)
  return { success: true, data: result }
})

// 房间相关
registerIPCHandler('cloud-sync-rooms', async () => {
  const result = await cloudRoomManager.syncRooms()
  return { success: true, data: result }
})

registerIPCHandler('cloud-get-rooms', async () => {
  const result = cloudRoomManager.getRooms()
  return { success: true, data: result }
})

registerIPCHandler('cloud-get-room', async (event, roomId) => {
  const result = cloudRoomManager.getRoom(roomId)
  return { success: true, data: result }
})

// 分组相关
registerIPCHandler('cloud-sync-groups', async () => {
  const result = await cloudGroupManager.syncGroups()
  return { success: true, data: result }
})

registerIPCHandler('cloud-get-groups', async () => {
  const result = cloudGroupManager.getGroups()
  return { success: true, data: result }
})

registerIPCHandler('cloud-get-group', async (event, groupId) => {
  const result = cloudGroupManager.getGroup(groupId)
  return { success: true, data: result }
})

registerIPCHandler('cloud-control-group', async (event, groupId, executions) => {
  const result = await cloudGroupManager.controlGroup(groupId, executions)
  return { success: true, data: result }
})

registerIPCHandler('cloud-toggle-group-power', async (event, groupId, power) => {
  const result = await cloudGroupManager.toggleGroupPower(groupId, power)
  return { success: true, data: result }
})

// 情景相关
registerIPCHandler('cloud-sync-scenes', async () => {
  const result = await cloudSceneManager.syncScenes()
  return { success: true, data: result }
})

registerIPCHandler('cloud-get-scenes', async () => {
  const result = cloudSceneManager.getScenes()
  return { success: true, data: result }
})

registerIPCHandler('cloud-get-scene', async (event, sceneId) => {
  const result = cloudSceneManager.getScene(sceneId)
  return { success: true, data: result }
})

registerIPCHandler('cloud-execute-scene', async (event, sceneId) => {
  const result = await cloudSceneManager.executeScene(sceneId)
  return { success: true, data: result }
})

// 自动化相关
registerIPCHandler('cloud-sync-automations', async () => {
  const result = await cloudAutomationManager.syncAutomations()
  return { success: true, data: result }
})

registerIPCHandler('cloud-get-automations', async () => {
  const result = cloudAutomationManager.getAutomations()
  return { success: true, data: result }
})

registerIPCHandler('cloud-get-automation', async (event, automationId) => {
  const result = cloudAutomationManager.getAutomation(automationId)
  return { success: true, data: result }
})

registerIPCHandler('cloud-enable-automation', async (event, automationId) => {
  const result = await cloudAutomationManager.enableAutomation(automationId)
  return { success: true, data: result }
})

registerIPCHandler('cloud-disable-automation', async (event, automationId) => {
  const result = await cloudAutomationManager.disableAutomation(automationId)
  return { success: true, data: result }
})

// 同步相关
registerIPCHandler('cloud-sync-now', async (event, syncTypes) => {
  const result = await syncManager.syncNow(syncTypes)
  return { success: true, data: result }
})

registerIPCHandler('cloud-get-sync-status', async () => {
  const result = syncManager.getSyncStatus()
  return { success: true, data: result }
})

registerIPCHandler('cloud-set-sync-config', async (event, config) => {
  const result = syncManager.setSyncConfig(config)
  return { success: true, data: result }
})

registerIPCHandler('cloud-get-sync-config', async () => {
  const result = syncManager.getSyncConfig()
  return { success: true, data: result }
})

