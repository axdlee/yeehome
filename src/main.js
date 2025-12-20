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
const TimerManager = require('./services/timer/TimerManager')
const SceneRecommender = require('./services/ai/SceneRecommender')
const IPC = require('./main/ipc-channels')

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

// 创建定时管理器实例
const timerManager = new TimerManager()

// 创建AI场景推荐器实例
const sceneRecommender = new SceneRecommender()

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
  IPC.Events.CLOUD_AUTOMATIONS_SYNCED,
  (automations) => `主进程接收到云端自动化同步完成事件: ${automations.length}个自动化`
);

// 监听认证相关事件
forwardEventToRenderer(
  cloudDeviceManager,
  'authenticated',
  IPC.Events.CLOUD_AUTHENTICATED,
  () => '主进程接收到云端认证成功事件'
);

forwardEventToRenderer(
  cloudDeviceManager,
  'tokenRefreshed',
  IPC.Events.CLOUD_TOKEN_REFRESHED,
  () => '主进程接收到云端token刷新成功事件'
);

forwardEventToRenderer(
  cloudDeviceManager,
  'logout',
  IPC.Events.CLOUD_LOGOUT,
  () => '主进程接收到云端登出事件'
);

// 监听Yeelight服务事件
forwardEventToRenderer(
  yeelightService,
  'deviceAdded',
  IPC.Events.DEVICE_ADDED,
  (device) => `主进程接收到设备添加事件: ${device.id}`
);

forwardEventToRenderer(
  yeelightService,
  'discoverDone',
  IPC.Events.DISCOVER_DONE,
  (devices) => `主进程接收到设备发现完成事件: ${devices.length}个设备`
);

forwardEventToRenderer(
  yeelightService,
  'deviceUpdated',
  IPC.Events.DEVICE_UPDATED,
  (device) => `主进程接收到设备更新事件: ${device.id}`
);

forwardEventToRenderer(
  yeelightService,
  'sceneApplied',
  IPC.Events.SCENE_APPLIED,
  (sceneId, actions) => `主进程接收到情景应用事件: ${sceneId}`
);

forwardEventToRenderer(
  yeelightService,
  'scenesReceived',
  IPC.Events.SCENES_RECEIVED,
  (deviceId, scenes) => `主进程接收到设备情景列表: ${deviceId}`
);

// 监听定时器管理器事件
forwardEventToRenderer(
  timerManager,
  'timerCreated',
  IPC.Events.TIMER_CREATED,
  (timer) => `主进程接收到定时任务创建事件: ${timer.name}`
);

forwardEventToRenderer(
  timerManager,
  'timerUpdated',
  IPC.Events.TIMER_UPDATED,
  (timer) => `主进程接收到定时任务更新事件: ${timer.name}`
);

forwardEventToRenderer(
  timerManager,
  'timerDeleted',
  IPC.Events.TIMER_DELETED,
  (timerId) => `主进程接收到定时任务删除事件: ${timerId}`
);

forwardEventToRenderer(
  timerManager,
  'timerTriggered',
  IPC.Events.TIMER_TRIGGERED,
  (data) => `主进程接收到定时任务触发事件: ${data.timerName}`
);

// 处理定时任务触发后的设备控制
eventManager.on(timerManager, 'timerTriggered', async (data) => {
  console.log(`定时任务触发: ${data.timerName}`, data.action)

  const { action } = data
  const targetId = action.targetId
  const isLocal = targetId.startsWith('local:')
  const isCloud = targetId.startsWith('cloud:')
  const deviceId = targetId.replace(/^(local|cloud):/, '')

  try {
    let result = false

    switch (action.type) {
      case 'on':
        result = isCloud
          ? await cloudDeviceManager.togglePower(deviceId, true)
          : yeelightService.togglePower(deviceId, true)
        break

      case 'off':
        result = isCloud
          ? await cloudDeviceManager.togglePower(deviceId, false)
          : yeelightService.togglePower(deviceId, false)
        break

      case 'toggle':
        result = isCloud
          ? await cloudDeviceManager.togglePower(deviceId)
          : yeelightService.toggle(deviceId)
        break

      case 'brightness':
        if (action.params?.brightness) {
          result = isCloud
            ? await cloudDeviceManager.setBrightness(deviceId, action.params.brightness)
            : yeelightService.setBrightness(deviceId, action.params.brightness)
        }
        break

      case 'ct':
        if (action.params?.colorTemp) {
          result = isCloud
            ? await cloudDeviceManager.setColorTemperature(deviceId, action.params.colorTemp)
            : yeelightService.setColorTemperature(deviceId, action.params.colorTemp)
        }
        break

      case 'color':
        if (action.params?.rgb) {
          result = isCloud
            ? await cloudDeviceManager.setColor(deviceId, action.params.rgb)
            : yeelightService.setColor(deviceId, action.params.rgb)
        }
        break

      case 'scene':
        if (action.params?.sceneId) {
          result = await cloudSceneManager.executeScene(action.params.sceneId)
        }
        break

      default:
        console.warn(`未知的定时任务动作类型: ${action.type}`)
    }

    console.log(`定时任务执行结果: ${result}`)
  } catch (error) {
    console.error(`定时任务执行失败:`, error)
  }
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

  // 关闭定时任务检查
  if (timerManager) {
    console.log('清理定时任务管理器...')
    timerManager.cleanup()
  }

  console.log('资源清理完成')
})

// OAuth回调服务器端口配置
const OAUTH_SERVER_PORT = process.env.OAUTH_SERVER_PORT || 3001

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

  // 启动服务器，监听配置端口
  oauthServer.listen(OAUTH_SERVER_PORT, () => {
    console.log(`OAuth回调服务器已启动，监听端口 ${OAUTH_SERVER_PORT}`)
  })

  // 处理端口冲突
  oauthServer.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.warn(`端口 ${OAUTH_SERVER_PORT} 已被占用，OAuth 回调服务器启动失败`)
    } else {
      console.error('OAuth 服务器错误:', error)
    }
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
registerIPCHandler(IPC.LocalDevice.DISCOVER, async () => {
  yeelightService.discoverDevices()
  return { success: true }
})

registerIPCHandler(IPC.LocalDevice.GET_DEVICES, async () => {
  return { success: true, data: yeelightService.getDevices() }
})

registerIPCHandler(IPC.LocalDevice.TOGGLE_POWER, async (event, deviceId, power) => {
  const result = yeelightService.togglePower(deviceId, power)
  return { success: true, data: result }
})

registerIPCHandler(IPC.LocalDevice.SET_BRIGHTNESS, async (event, deviceId, brightness) => {
  const result = yeelightService.setBrightness(deviceId, brightness)
  return { success: true, data: result }
})

registerIPCHandler(IPC.LocalDevice.SET_COLOR_TEMP, async (event, deviceId, colorTemperature) => {
  const result = yeelightService.setColorTemperature(deviceId, colorTemperature)
  return { success: true, data: result }
})

registerIPCHandler(IPC.LocalDevice.SET_COLOR, async (event, deviceId, rgb) => {
  const result = yeelightService.setColor(deviceId, rgb)
  return { success: true, data: result }
})

registerIPCHandler(IPC.LocalDevice.GET_SCENES, async (event, deviceId) => {
  yeelightService.getScenesFromDevice(deviceId)
  return { success: true }
})

registerIPCHandler(IPC.LocalDevice.GET_GROUPS, async (event, deviceId) => {
  yeelightService.getGroupsFromDevice(deviceId)
  return { success: true }
})

registerIPCHandler(IPC.LocalDevice.TOGGLE_DEVICE, async (event, deviceId) => {
  const result = yeelightService.toggle(deviceId)
  return { success: true, data: result }
})

registerIPCHandler(IPC.LocalDevice.SET_SCENE, async (event, deviceId, sceneType, params) => {
  const result = yeelightService.setScene(deviceId, sceneType, params)
  return { success: true, data: result }
})

registerIPCHandler(IPC.LocalDevice.SET_DEFAULT, async (event, deviceId) => {
  const result = yeelightService.setDefault(deviceId)
  return { success: true, data: result }
})

// 云服务相关的IPC事件处理

// 认证相关
registerIPCHandler(IPC.CloudAuth.GET_AUTH_URL, async (event, state) => {
  const result = await cloudDeviceManager.getAuthorizationUrl(state)
  return { success: true, data: result }
})

registerIPCHandler(IPC.CloudAuth.GET_ACCESS_TOKEN, async (event, code) => {
  const result = await cloudDeviceManager.getAccessToken(code)
  return { success: true, data: result }
})

registerIPCHandler(IPC.CloudAuth.IS_AUTHENTICATED, async () => {
  const result = cloudDeviceManager.isAuthenticated()
  return { success: true, data: result }
})

registerIPCHandler(IPC.CloudAuth.GET_AUTH_STATUS, async () => {
  const result = cloudDeviceManager.getAuthStatus()
  return { success: true, data: result }
})

registerIPCHandler(IPC.CloudAuth.LOGOUT, async () => {
  await cloudDeviceManager.logout()
  return { success: true }
})

// 设备相关
registerIPCHandler(IPC.CloudDevice.SYNC, async () => {
  const result = await cloudDeviceManager.syncDevices()
  return { success: true, data: result }
})

registerIPCHandler(IPC.CloudDevice.GET_ALL, async () => {
  const result = cloudDeviceManager.getDevices()
  return { success: true, data: result }
})

registerIPCHandler(IPC.CloudDevice.GET_ONE, async (event, deviceId) => {
  const result = cloudDeviceManager.getDevice(deviceId)
  return { success: true, data: result }
})

registerIPCHandler(IPC.CloudDevice.QUERY, async (event, deviceIds) => {
  const result = await cloudDeviceManager.queryDevices(deviceIds)
  return { success: true, data: result }
})

registerIPCHandler(IPC.CloudDevice.CONTROL, async (event, deviceId, executions) => {
  const result = await cloudDeviceManager.controlDevice(deviceId, executions)
  return { success: true, data: result }
})

registerIPCHandler(IPC.CloudDevice.TOGGLE_POWER, async (event, deviceId, power) => {
  const result = await cloudDeviceManager.togglePower(deviceId, power)
  return { success: true, data: result }
})

registerIPCHandler(IPC.CloudDevice.SET_BRIGHTNESS, async (event, deviceId, brightness) => {
  const result = await cloudDeviceManager.setBrightness(deviceId, brightness)
  return { success: true, data: result }
})

registerIPCHandler(IPC.CloudDevice.SET_COLOR_TEMP, async (event, deviceId, colorTemperature) => {
  const result = await cloudDeviceManager.setColorTemperature(deviceId, colorTemperature)
  return { success: true, data: result }
})

registerIPCHandler(IPC.CloudDevice.SET_COLOR, async (event, deviceId, rgb) => {
  const result = await cloudDeviceManager.setColor(deviceId, rgb)
  return { success: true, data: result }
})

// 房间相关
registerIPCHandler(IPC.CloudRoom.SYNC, async () => {
  const result = await cloudRoomManager.syncRooms()
  return { success: true, data: result }
})

registerIPCHandler(IPC.CloudRoom.GET_ALL, async () => {
  const result = cloudRoomManager.getRooms()
  return { success: true, data: result }
})

registerIPCHandler(IPC.CloudRoom.GET_ONE, async (event, roomId) => {
  const result = cloudRoomManager.getRoom(roomId)
  return { success: true, data: result }
})

// 分组相关
registerIPCHandler(IPC.CloudGroup.SYNC, async () => {
  const result = await cloudGroupManager.syncGroups()
  return { success: true, data: result }
})

registerIPCHandler(IPC.CloudGroup.GET_ALL, async () => {
  const result = cloudGroupManager.getGroups()
  return { success: true, data: result }
})

registerIPCHandler(IPC.CloudGroup.GET_ONE, async (event, groupId) => {
  const result = cloudGroupManager.getGroup(groupId)
  return { success: true, data: result }
})

registerIPCHandler(IPC.CloudGroup.CONTROL, async (event, groupId, executions) => {
  const result = await cloudGroupManager.controlGroup(groupId, executions)
  return { success: true, data: result }
})

registerIPCHandler(IPC.CloudGroup.TOGGLE_POWER, async (event, groupId, power) => {
  const result = await cloudGroupManager.toggleGroupPower(groupId, power)
  return { success: true, data: result }
})

// 情景相关
registerIPCHandler(IPC.CloudScene.SYNC, async () => {
  const result = await cloudSceneManager.syncScenes()
  return { success: true, data: result }
})

registerIPCHandler(IPC.CloudScene.GET_ALL, async () => {
  const result = cloudSceneManager.getScenes()
  return { success: true, data: result }
})

registerIPCHandler(IPC.CloudScene.GET_ONE, async (event, sceneId) => {
  const result = cloudSceneManager.getScene(sceneId)
  return { success: true, data: result }
})

registerIPCHandler(IPC.CloudScene.EXECUTE, async (event, sceneId) => {
  const result = await cloudSceneManager.executeScene(sceneId)
  return { success: true, data: result }
})

// 自动化相关
registerIPCHandler(IPC.CloudAutomation.SYNC, async () => {
  const result = await cloudAutomationManager.syncAutomations()
  return { success: true, data: result }
})

registerIPCHandler(IPC.CloudAutomation.GET_ALL, async () => {
  const result = cloudAutomationManager.getAutomations()
  return { success: true, data: result }
})

registerIPCHandler(IPC.CloudAutomation.GET_ONE, async (event, automationId) => {
  const result = cloudAutomationManager.getAutomation(automationId)
  return { success: true, data: result }
})

registerIPCHandler(IPC.CloudAutomation.ENABLE, async (event, automationId) => {
  const result = await cloudAutomationManager.enableAutomation(automationId)
  return { success: true, data: result }
})

registerIPCHandler(IPC.CloudAutomation.DISABLE, async (event, automationId) => {
  const result = await cloudAutomationManager.disableAutomation(automationId)
  return { success: true, data: result }
})

// 同步相关
registerIPCHandler(IPC.Sync.SYNC_NOW, async (event, syncTypes) => {
  const result = await syncManager.syncNow(syncTypes)
  return { success: true, data: result }
})

registerIPCHandler(IPC.Sync.GET_STATUS, async () => {
  const result = syncManager.getSyncStatus()
  return { success: true, data: result }
})

registerIPCHandler(IPC.Sync.SET_CONFIG, async (event, config) => {
  const result = syncManager.setSyncConfig(config)
  return { success: true, data: result }
})

registerIPCHandler(IPC.Sync.GET_CONFIG, async () => {
  const result = syncManager.getSyncConfig()
  return { success: true, data: result }
})

// 定时器相关
registerIPCHandler(IPC.Timer.GET_ALL, async (event, query) => {
  const result = timerManager.getTimers(query)
  return { success: true, data: result }
})

registerIPCHandler(IPC.Timer.GET_ONE, async (event, timerId) => {
  const result = timerManager.getTimer(timerId)
  return { success: true, data: result }
})

registerIPCHandler(IPC.Timer.CREATE, async (event, params) => {
  const result = timerManager.createTimer(params)
  return { success: true, data: result }
})

registerIPCHandler(IPC.Timer.UPDATE, async (event, timerId, updates) => {
  const result = timerManager.updateTimer(timerId, updates)
  return { success: true, data: result }
})

registerIPCHandler(IPC.Timer.DELETE, async (event, timerId) => {
  const result = timerManager.deleteTimer(timerId)
  return { success: true, data: result }
})

registerIPCHandler(IPC.Timer.ENABLE, async (event, timerId) => {
  const result = timerManager.setTimerEnabled(timerId, true)
  return { success: true, data: result }
})

registerIPCHandler(IPC.Timer.DISABLE, async (event, timerId) => {
  const result = timerManager.setTimerEnabled(timerId, false)
  return { success: true, data: result }
})

registerIPCHandler(IPC.Timer.TRIGGER, async (event, timerId) => {
  const result = timerManager.triggerTimer(timerId)
  return { success: true, data: result }
})

registerIPCHandler(IPC.Timer.GET_STATS, async () => {
  const result = timerManager.getStats()
  return { success: true, data: result }
})

registerIPCHandler(IPC.Timer.GET_UPCOMING, async (event, limit) => {
  const result = timerManager.getUpcomingTimers(limit)
  return { success: true, data: result }
})

