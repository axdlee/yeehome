/**
 * IPC 服务 - 类型安全的主进程通信
 */

import type { Device, DeviceSource } from '@/renderer/types/device'
import type { Room } from '@/renderer/types/room'
import type { Scene } from '@/renderer/types/scene'
import type { Group } from '@/renderer/types/group'
import type { Automation } from '@/renderer/types/automation'
import type { Timer } from '@/renderer/types/timer'

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

// IPC 响应类型
interface IPCResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    name: string
    code: string
    message: string
    statusCode?: number
    timestamp?: string
    context?: string
  }
}

// IPC 错误类
class IPCError extends Error {
  code: string
  statusCode: number
  timestamp: string
  context: string

  constructor(error: IPCResponse['error']) {
    super(error?.message || '未知错误')
    this.name = error?.name || 'IPCError'
    this.code = error?.code || 'UNKNOWN_ERROR'
    this.statusCode = error?.statusCode || 500
    this.timestamp = error?.timestamp || new Date().toISOString()
    this.context = error?.context || 'IPC'
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
  // 定时器事件
  timerCreated?: (timer: Timer) => void
  timerUpdated?: (timer: Timer) => void
  timerDeleted?: (timerId: string) => void
  timerTriggered?: (data: { timerId: string; timerName: string }) => void
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
  'oauth-callback': 'oauthCallback',
  'timer-created': 'timerCreated',
  'timer-updated': 'timerUpdated',
  'timer-deleted': 'timerDeleted',
  'timer-triggered': 'timerTriggered'
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

  /**
   * 统一的 IPC 请求方法
   * 处理响应格式并在错误时抛出 IPCError
   */
  private async request<T>(channel: string, ...args: any[]): Promise<T> {
    const response: IPCResponse<T> = await this.ipcRenderer.invoke(channel, ...args)

    if (!response.success) {
      throw new IPCError(response.error)
    }

    return response.data as T
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
    return this.request<void>('discover-devices')
  }

  async getDevices(): Promise<Device[]> {
    return this.request<Device[]>('get-devices')
  }

  async togglePower(deviceId: string, power: boolean): Promise<boolean> {
    return this.request<boolean>('toggle-power', deviceId, power)
  }

  async setBrightness(deviceId: string, brightness: number): Promise<boolean> {
    return this.request<boolean>('set-brightness', deviceId, brightness)
  }

  async setColorTemperature(deviceId: string, ct: number): Promise<boolean> {
    return this.request<boolean>('set-color-temperature', deviceId, ct)
  }

  async setColor(deviceId: string, rgb: number): Promise<boolean> {
    return this.request<boolean>('set-color', deviceId, rgb)
  }

  async toggleDevice(deviceId: string): Promise<boolean> {
    return this.request<boolean>('toggle-device', deviceId)
  }

  async setScene(deviceId: string, sceneType: string, params: any[]): Promise<boolean> {
    return this.request<boolean>('set-scene', deviceId, sceneType, params)
  }

  async setDefault(deviceId: string): Promise<boolean> {
    return this.request<boolean>('set-default', deviceId)
  }

  // ==================== 云认证方法 ====================

  async getAuthorizationUrl(state?: string): Promise<string> {
    return this.request<string>('cloud-get-authorization-url', state)
  }

  async getAccessToken(code: string): Promise<{ access_token: string; refresh_token: string }> {
    return this.request<{ access_token: string; refresh_token: string }>('cloud-get-access-token', code)
  }

  async isAuthenticated(): Promise<boolean> {
    return this.request<boolean>('cloud-is-authenticated')
  }

  async getAuthStatus(): Promise<{ authenticated: boolean; expiresAt?: number }> {
    return this.request<{ authenticated: boolean; expiresAt?: number }>('cloud-get-auth-status')
  }

  async logout(): Promise<void> {
    return this.request<void>('cloud-logout')
  }

  // ==================== 云设备方法 ====================

  async cloudSyncDevices(): Promise<Device[]> {
    return this.request<Device[]>('cloud-sync-devices')
  }

  async cloudGetDevices(): Promise<Device[]> {
    return this.request<Device[]>('cloud-get-devices')
  }

  async cloudGetDevice(deviceId: string): Promise<Device | null> {
    return this.request<Device | null>('cloud-get-device', deviceId)
  }

  async cloudTogglePower(deviceId: string, power: boolean): Promise<boolean> {
    return this.request<boolean>('cloud-toggle-power', deviceId, power)
  }

  async cloudSetBrightness(deviceId: string, brightness: number): Promise<boolean> {
    return this.request<boolean>('cloud-set-brightness', deviceId, brightness)
  }

  async cloudSetColorTemperature(deviceId: string, ct: number): Promise<boolean> {
    return this.request<boolean>('cloud-set-color-temperature', deviceId, ct)
  }

  async cloudSetColor(deviceId: string, rgb: number): Promise<boolean> {
    return this.request<boolean>('cloud-set-color', deviceId, rgb)
  }

  // ==================== 云房间方法 ====================

  async cloudSyncRooms(): Promise<Room[]> {
    return this.request<Room[]>('cloud-sync-rooms')
  }

  async cloudGetRooms(): Promise<Room[]> {
    return this.request<Room[]>('cloud-get-rooms')
  }

  async cloudGetRoom(roomId: string): Promise<Room | null> {
    return this.request<Room | null>('cloud-get-room', roomId)
  }

  // ==================== 云分组方法 ====================

  async cloudSyncGroups(): Promise<Group[]> {
    return this.request<Group[]>('cloud-sync-groups')
  }

  async cloudGetGroups(): Promise<Group[]> {
    return this.request<Group[]>('cloud-get-groups')
  }

  async cloudGetGroup(groupId: string): Promise<Group | null> {
    return this.request<Group | null>('cloud-get-group', groupId)
  }

  async cloudToggleGroupPower(groupId: string, power: boolean): Promise<boolean> {
    return this.request<boolean>('cloud-toggle-group-power', groupId, power)
  }

  // ==================== 云情景方法 ====================

  async cloudSyncScenes(): Promise<Scene[]> {
    return this.request<Scene[]>('cloud-sync-scenes')
  }

  async cloudGetScenes(): Promise<Scene[]> {
    return this.request<Scene[]>('cloud-get-scenes')
  }

  async cloudGetScene(sceneId: string): Promise<Scene | null> {
    return this.request<Scene | null>('cloud-get-scene', sceneId)
  }

  async cloudExecuteScene(sceneId: string): Promise<boolean> {
    return this.request<boolean>('cloud-execute-scene', sceneId)
  }

  // ==================== 云自动化方法 ====================

  async cloudSyncAutomations(): Promise<Automation[]> {
    return this.request<Automation[]>('cloud-sync-automations')
  }

  async cloudGetAutomations(): Promise<Automation[]> {
    return this.request<Automation[]>('cloud-get-automations')
  }

  async cloudGetAutomation(automationId: string): Promise<Automation | null> {
    return this.request<Automation | null>('cloud-get-automation', automationId)
  }

  async cloudEnableAutomation(automationId: string): Promise<boolean> {
    return this.request<boolean>('cloud-enable-automation', automationId)
  }

  async cloudDisableAutomation(automationId: string): Promise<boolean> {
    return this.request<boolean>('cloud-disable-automation', automationId)
  }

  // ==================== 同步方法 ====================

  async cloudSyncNow(syncTypes?: string[]): Promise<void> {
    return this.request<void>('cloud-sync-now', syncTypes)
  }

  async cloudGetSyncStatus(): Promise<{ lastSync?: Date; syncing: boolean }> {
    return this.request<{ lastSync?: Date; syncing: boolean }>('cloud-get-sync-status')
  }

  // ==================== 定时任务方法 ====================

  async getTimers(query?: Record<string, any>): Promise<any[]> {
    return this.request<any[]>('timer-get-all', query)
  }

  async createTimer(params: Record<string, any>): Promise<any> {
    return this.request<any>('timer-create', params)
  }

  async updateTimer(timerId: string, updates: Record<string, any>): Promise<any> {
    return this.request<any>('timer-update', { timerId, updates })
  }

  async deleteTimer(timerId: string): Promise<boolean> {
    return this.request<boolean>('timer-delete', timerId)
  }

  async toggleTimer(timerId: string): Promise<any> {
    return this.request<any>('timer-toggle', timerId)
  }

  async triggerTimer(timerId: string): Promise<boolean> {
    return this.request<boolean>('timer-trigger', timerId)
  }

  async getTimerStats(): Promise<Record<string, number>> {
    return this.request<Record<string, number>>('timer-get-stats')
  }

  // ==================== AI场景推荐方法 ====================

  async getAIRecommendations(options?: { maxRecommendations?: number }): Promise<any> {
    return this.request<any>('ai-get-recommendations', options)
  }

  async getAIScenes(): Promise<{ scenes: any[] }> {
    return this.request<{ scenes: any[] }>('ai-get-scenes')
  }

  async applyAIScene(sceneId: string): Promise<{ success: boolean; results: any[] }> {
    return this.request<{ success: boolean; results: any[] }>('ai-apply-scene', sceneId)
  }

  async recordAIRecommendationFeedback(sceneId: string, feedback: any): Promise<void> {
    return this.request<void>('ai-record-feedback', { sceneId, feedback })
  }

  async createAICustomScene(sceneData: any): Promise<{ scene: any }> {
    return this.request<{ scene: any }>('ai-create-custom-scene', sceneData)
  }

  async updateAIScene(sceneId: string, updates: any): Promise<{ scene: any }> {
    return this.request<{ scene: any }>('ai-update-scene', { sceneId, updates })
  }

  async deleteAIScene(sceneId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('ai-delete-scene', sceneId)
  }

  async getAIUsageStats(): Promise<any> {
    return this.request<any>('ai-get-usage-stats')
  }

  async updateAIPreferences(prefs: any): Promise<void> {
    return this.request<void>('ai-update-preferences', prefs)
  }

  // ==================== 系统方法 ====================

  async openExternal(url: string): Promise<void> {
    return this.request<void>('open-external', url)
  }

  async getAppVersion(): Promise<string> {
    return this.request<string>('get-app-version')
  }
}

// 单例导出
const ipcService = new IPCService()
export default ipcService

// 导出 IPCError 供外部使用
export { IPCError }
