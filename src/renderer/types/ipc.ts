/**
 * IPC 通道类型定义
 */

import type { Device } from './device'
import type { Room } from './room'
import type { Scene } from './scene'
import type { Group } from './group'
import type { Automation } from './automation'

// IPC 通道映射接口
export interface IPCChannels {
  // ========== 设备相关 ==========
  'discover-devices': () => void
  'get-devices': () => Device[]
  'toggle-power': (deviceId: string, power: boolean, source: 'local' | 'cloud') => boolean
  'set-brightness': (deviceId: string, brightness: number, source: 'local' | 'cloud') => boolean
  'set-color-temp': (deviceId: string, ct: number, source: 'local' | 'cloud') => boolean
  'set-rgb': (deviceId: string, rgb: number, source: 'local' | 'cloud') => boolean
  'set-hsv': (deviceId: string, hue: number, sat: number, source: 'local' | 'cloud') => boolean

  // ========== 房间相关 ==========
  'room:get-all': () => Room[]
  'room:create': (room: Omit<Room, 'id'>) => Room
  'room:update': (id: string, room: Partial<Room>) => Room
  'room:delete': (id: string) => boolean

  // ========== 情景相关 ==========
  'scene:get-all': () => Scene[]
  'scene:create': (scene: Omit<Scene, 'id'>) => Scene
  'scene:update': (id: string, scene: Partial<Scene>) => Scene
  'scene:delete': (id: string) => boolean
  'scene:execute': (id: string) => boolean

  // ========== 灯组相关 ==========
  'group:get-all': () => Group[]
  'group:create': (group: Omit<Group, 'id'>) => Group
  'group:update': (id: string, group: Partial<Group>) => Group
  'group:delete': (id: string) => boolean

  // ========== 自动化相关 ==========
  'automation:get-all': () => Automation[]
  'automation:create': (automation: Omit<Automation, 'id'>) => Automation
  'automation:update': (id: string, automation: Partial<Automation>) => Automation
  'automation:delete': (id: string) => boolean
  'automation:toggle': (id: string, enabled: boolean) => boolean

  // ========== 云端相关 ==========
  'cloud:auth': (code: string) => { access_token: string; refresh_token: string }
  'cloud:sync-devices': () => Device[]
  'cloud:is-authenticated': () => boolean
  'cloud:logout': () => void
  'cloud:toggle-power': (deviceId: string, power: boolean) => boolean
  'cloud:set-brightness': (deviceId: string, brightness: number) => boolean
  'cloud:set-color-temp': (deviceId: string, ct: number) => boolean
  'cloud:set-rgb': (deviceId: string, rgb: number) => boolean
}

// IPC 事件类型
export interface IPCEvents {
  'deviceAdded': Device
  'deviceUpdated': Device
  'deviceRemoved': string
  'deviceStatusChanged': { id: string; status: any }
  'cloudAuthSuccess': void
  'cloudAuthFailed': Error
}
