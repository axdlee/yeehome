// preload.js
const { contextBridge, ipcRenderer } = require('electron')

// 使用contextBridge安全地暴露IPC事件到渲染进程
contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    // 监听主进程发送的事件
    on: (channel, func) => {
      const validChannels = ['device-added', 'discover-done', 'device-updated', 'scene-applied', 'scenes-received']
      if (validChannels.includes(channel)) {
        ipcRenderer.on(channel, (event, ...args) => func(...args))
      }
    },
    // 发送同步消息到主进程
    sendSync: (channel, ...args) => {
      const validChannels = []
      if (validChannels.includes(channel)) {
        return ipcRenderer.sendSync(channel, ...args)
      }
    },
    // 发送异步消息到主进程
    invoke: (channel, ...args) => {
      const validChannels = [
        'discover-devices', 'get-devices', 'toggle-power', 'set-brightness',
        'set-color-temperature', 'set-color', 'get-scenes-from-device',
        'get-groups-from-device', 'toggle-device', 'set-scene', 'set-default'
      ]
      if (validChannels.includes(channel)) {
        return ipcRenderer.invoke(channel, ...args)
      }
    }
  }
})

window.addEventListener('DOMContentLoaded', () => {
  // 在这里可以添加初始化代码
})
