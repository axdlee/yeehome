const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const YeelightService = require('./services/YeelightService')

// 创建Yeelight服务实例
const yeelightService = new YeelightService()

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

  // 打开开发者工具
  win.webContents.openDevTools()
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

  // 打开开发者工具
  win.webContents.openDevTools()
  
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

