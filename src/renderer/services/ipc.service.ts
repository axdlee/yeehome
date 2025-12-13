/**
 * IPC 服务 - 类型安全的主进程通信
 */

import type { Device, DeviceSource } from '@/renderer/types/device'
import type { Room } from '@/renderer/types/room'
import type { Scene } from '@/renderer/types/scene'
import type { Group } from '@/renderer/types/group'
import type { Automation } from '@/renderer/types/automation'

// 定义window.electron类型
declare global {
  interface Window {
    electron: {
      ipcRenderer: {
        invoke(channel: string, ...args: any[]): Promise<any>
        on(channel: string, listener: (...args: any[]) => void): void
        removeListener(channel: string, listener: (...args: any[]) => void): void
      }
    }
  }
}

// 事件映射类型
interface EventCallbacks {
  // 本地设备事件
  deviceAdded?: (device: Device) => void
  discoverDone?: () => void
  deviceUpdated?: (device: Device) => void
  sceneApplied?: (sceneId: string) => void
  scenesReceived?: (scenes: Scene[]) => void
  // 云设备事件
  cloudDevicesSynced?: (devices: Device[]) => void
  cloudDeviceUpdated?: (device: Device) => void
  cloudSyncError?: (error: Error) => void
  cloudAuthError?: (error: Error) => void
  // 云房间事件
  cloudRoomsSynced?: (rooms: Room[]) => void
  // 云分组事件
  cloudGroupsSynced?: (groups: Group[]) => void
  // 云情景事件
  cloudScenesSynced?: (scenes: Scene[]) => void
  cloudSceneExecuted?: (sceneId: string) => void
  // 云自动化事件
  cloudAutomationsSynced?: (automations: Automation[]) => void
  // 云认证事件
  cloudAuthenticated?: () => void
  cloudTokenRefreshed?: () => void
  cloudLogout?: () => void
  // OAuth回调事件
  oauthCallback?: (code: string) => void
}

// 事件名映射
const eventMap: Record<string, keyof EventCallbacks> = {
  'device-added': 'deviceAdded',
  'discover-done': 'discoverDone',
  'device-updated': 'deviceUpdated',
  'scene-applied': 'sceneApplied',
  'scenes-received': 'scenesReceived',
  'cloud-devices-synced': 'cloudDevicesSynced',
  'cloud-device-updated': 'cloudDeviceUpdated',
  'cloud-sync-error': 'cloudSyncError',
  'cloud-auth-error': 'cloudAuthError',
  'cloud-rooms-synced': 'cloudRoomsSynced',
  'cloud-groups-synced': 'cloudGroupsSynced',
  'cloud-scenes-synced': 'cloudScenesSynced',
  'cloud-scene-executed': 'cloudSceneExecuted',
  'cloud-automations-synced': 'cloudAutomationsSynced',
  'cloud-authenticated': 'cloudAuthenticated',
  'cloud-token-refreshed': 'cloudTokenRefreshed',
  'cloud-logout': 'cloudLogout',
  'oauth-callback': 'oauthCallback'
}

class IPCService {
  private callbacks: EventCallbacks = {}
  private eventListeners: Map<string, (...args: any[]) => void> = new Map()
  private ipcRenderer = window.electron?.ipcRenderer

  constructor() {
    if (this.ipcRenderer) {
      this.registerGlobalEventListeners()
    }
  }

  // 注册全局事件监听器
  private registerGlobalEventListeners(): void {
    Object.entries(eventMap).forEach(([channel, callbackName]) => {
      const listener = (...args: any[]): void => {
        console.log(`[IPC] 收到事件: ${channel}`, ...args)
        const callback = this.callbacks[callbackName]
        if (callback) {
          (callback as Function)(...args)
        }
      }

      this.ipcRenderer.on(channel, listener)
      this.eventListeners.set(channel, listener)
    })
  }

  // 移除全局事件监听器
  private removeGlobalEventListeners(): void {
    this.eventListeners.forEach((listener, channel) => {
      this.ipcRenderer.removeListener(channel, listener)
    })
    this.eventListeners.clear()
  }

  // 注册事件回调
  on<K extends keyof EventCallbacks>(event: K, callback: EventCallbacks[K]): void {
    this.callbacks[event] = callback
  }

  // 移除事件回调
  off(event: keyof EventCallbacks): void {
    delete this.callbacks[event]
  }

  // 销毁IPCService实例
  destroy(): void {
    this.callbacks = {}
    this.removeGlobalEventListeners()
  }

  // ==================== 本地设备方法 ====================

  async discoverDevices(): Promise<void> {
    return this.ipcRenderer.invoke('discover-devices')
  }

  async getDevices(): Promise<Device[]> {
    return this.ipcRenderer.invoke('get-devices')
  }

  async togglePower(deviceId: string, power: boolean): Promise<boolean> {
    return this.ipcRenderer.invoke('toggle-power', deviceId, power)
  }

  async setBrightness(deviceId: string, brightness: number): Promise<boolean> {
    return this.ipcRenderer.invoke('set-brightness', deviceId, brightness)
  }

  async setColorTemperature(deviceId: string, ct: number): Promise<boolean> {
    return this.ipcRenderer.invoke('set-color-temperature', deviceId, ct)
  }

  async setColor(deviceId: string, rgb: number): Promise<boolean> {
    return this.ipcRenderer.invoke('set-color', deviceId, rgb)
  }

  async toggleDevice(deviceId: string): Promise<boolean> {
    return this.ipcRenderer.invoke('toggle-device', deviceId)
  }

  async setScene(deviceId: string, sceneType: string, params: any[]): Promise<boolean> {
    return this.ipcRenderer.invoke('set-scene', deviceId, sceneType, params)
  }

  async setDefault(deviceId: string): Promise<boolean> {
    return this.ipcRenderer.invoke('set-default', deviceId)
  }

  // ==================== 云认证方法 ====================

  async getAuthorizationUrl(state?: string): Promise<string> {
    return this.ipcRenderer.invoke('cloud-get-authorization-url', state)
  }

  async getAccessToken(code: string): Promise<{ access_token: string; refresh_token: string }> {
    return this.ipcRenderer.invoke('cloud-get-access-token', code)
  }

  async isAuthenticated(): Promise<boolean> {
    return this.ipcRenderer.invoke('cloud-is-authenticated')
  }

  async getAuthStatus(): Promise<{ authenticated: boolean; expiresAt?: number }> {
    return this.ipcRenderer.invoke('cloud-get-auth-status')
  }

  async logout(): Promise<void> {
    return this.ipcRenderer.invoke('cloud-logout')
  }

  // ==================== 云设备方法 ====================

  async cloudSyncDevices(): Promise<Device[]> {
    return this.ipcRenderer.invoke('cloud-sync-devices')
  }

  async cloudGetDevices(): Promise<Device[]> {
    return this.ipcRenderer.invoke('cloud-get-devices')
  }

  async cloudGetDevice(deviceId: string): Promise<Device | null> {
    return this.ipcRenderer.invoke('cloud-get-device', deviceId)
  }

  async cloudTogglePower(deviceId: string, power: boolean): Promise<boolean> {
    return this.ipcRenderer.invoke('cloud-toggle-power', deviceId, power)
  }

  async cloudSetBrightness(deviceId: string, brightness: number): Promise<boolean> {
    return this.ipcRenderer.invoke('cloud-set-brightness', deviceId, brightness)
  }

  async cloudSetColorTemperature(deviceId: string, ct: number): Promise<boolean> {
    return this.ipcRenderer.invoke('cloud-set-color-temperature', deviceId, ct)
  }

  async cloudSetColor(deviceId: string, rgb: number): Promise<boolean> {
    return this.ipcRenderer.invoke('cloud-set-color', deviceId, rgb)
  }

  // ==================== 云房间方法 ====================

  async cloudSyncRooms(): Promise<Room[]> {
    return this.ipcRenderer.invoke('cloud-sync-rooms')
  }

  async cloudGetRooms(): Promise<Room[]> {
    return this.ipcRenderer.invoke('cloud-get-rooms')
  }

  async cloudGetRoom(roomId: string): Promise<Room | null> {
    return this.ipcRenderer.invoke('cloud-get-room', roomId)
  }

  // ==================== 云分组方法 ====================

  async cloudSyncGroups(): Promise<Group[]> {
    return this.ipcRenderer.invoke('cloud-sync-groups')
  }

  async cloudGetGroups(): Promise<Group[]> {
    return this.ipcRenderer.invoke('cloud-get-groups')
  }

  async cloudGetGroup(groupId: string): Promise<Group | null> {
    return this.ipcRenderer.invoke('cloud-get-group', groupId)
  }

  async cloudToggleGroupPower(groupId: string, power: boolean): Promise<boolean> {
    return this.ipcRenderer.invoke('cloud-toggle-group-power', groupId, power)
  }

  // ==================== 云情景方法 ====================

  async cloudSyncScenes(): Promise<Scene[]> {
    return this.ipcRenderer.invoke('cloud-sync-scenes')
  }

  async cloudGetScenes(): Promise<Scene[]> {
    return this.ipcRenderer.invoke('cloud-get-scenes')
  }

  async cloudGetScene(sceneId: string): Promise<Scene | null> {
    return this.ipcRenderer.invoke('cloud-get-scene', sceneId)
  }

  async cloudExecuteScene(sceneId: string): Promise<boolean> {
    return this.ipcRenderer.invoke('cloud-execute-scene', sceneId)
  }

  // ==================== 云自动化方法 ====================

  async cloudSyncAutomations(): Promise<Automation[]> {
    return this.ipcRenderer.invoke('cloud-sync-automations')
  }

  async cloudGetAutomations(): Promise<Automation[]> {
    return this.ipcRenderer.invoke('cloud-get-automations')
  }

  async cloudGetAutomation(automationId: string): Promise<Automation | null> {
    return this.ipcRenderer.invoke('cloud-get-automation', automationId)
  }

  async cloudEnableAutomation(automationId: string): Promise<boolean> {
    return this.ipcRenderer.invoke('cloud-enable-automation', automationId)
  }

  async cloudDisableAutomation(automationId: string): Promise<boolean> {
    return this.ipcRenderer.invoke('cloud-disable-automation', automationId)
  }

  // ==================== 同步方法 ====================

  async cloudSyncNow(syncTypes?: string[]): Promise<void> {
    return this.ipcRenderer.invoke('cloud-sync-now', syncTypes)
  }

  async cloudGetSyncStatus(): Promise<{ lastSync?: Date; syncing: boolean }> {
    return this.ipcRenderer.invoke('cloud-get-sync-status')
  }
}

// 单例导出
const ipcService = new IPCService()
export default ipcService
