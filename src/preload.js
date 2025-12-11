// preload.js
const { contextBridge, ipcRenderer } = require('electron')

// 使用contextBridge安全地暴露IPC事件到渲染进程
contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    // 监听主进程发送的事件
    on: (channel, func) => {
      const validChannels = [
        // 本地设备事件
        'device-added', 'discover-done', 'device-updated', 'scene-applied', 'scenes-received',
        // 云设备事件
        'cloud-devices-synced', 'cloud-device-updated', 'cloud-sync-error', 'cloud-auth-error',
        // 云房间事件
        'cloud-rooms-synced', 'cloud-room-added', 'cloud-room-updated', 'cloud-room-deleted',
        // 云分组事件
        'cloud-groups-synced', 'cloud-group-updated',
        // 云情景事件
        'cloud-scenes-synced', 'cloud-scene-executed',
        // 云自动化事件
        'cloud-automations-synced', 'cloud-automation-updated',
        // 云服务事件
        'cloud-authenticated', 'cloud-token-refreshed', 'cloud-logout',
        // OAuth回调事件
        'oauth-callback'
      ]
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
        // 本地设备相关
        'discover-devices', 'get-devices', 'toggle-power', 'set-brightness',
        'set-color-temperature', 'set-color', 'get-scenes-from-device',
        'get-groups-from-device', 'toggle-device', 'set-scene', 'set-default',
        // 云服务认证相关
        'cloud-get-authorization-url', 'cloud-get-access-token', 'cloud-is-authenticated',
        'cloud-get-auth-status', 'cloud-logout',
        // 云设备相关
        'cloud-sync-devices', 'cloud-get-devices', 'cloud-get-device', 'cloud-query-devices',
        'cloud-control-device', 'cloud-toggle-power', 'cloud-set-brightness',
        'cloud-set-color-temperature', 'cloud-set-color',
        // 云房间相关
        'cloud-sync-rooms', 'cloud-get-rooms', 'cloud-get-room',
        // 云分组相关
        'cloud-sync-groups', 'cloud-get-groups', 'cloud-get-group', 'cloud-control-group',
        'cloud-toggle-group-power',
        // 云情景相关
        'cloud-sync-scenes', 'cloud-get-scenes', 'cloud-get-scene', 'cloud-execute-scene',
        // 云自动化相关
        'cloud-sync-automations', 'cloud-get-automations', 'cloud-get-automation',
        'cloud-enable-automation', 'cloud-disable-automation',
        // 同步相关
        'cloud-sync-now', 'cloud-get-sync-status', 'cloud-set-sync-config', 'cloud-get-sync-config'
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
