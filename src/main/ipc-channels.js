/**
 * IPC 通道常量定义
 * 集中管理所有 IPC 通道名称，避免拼写错误
 */

// 本地设备相关
const LocalDevice = {
  DISCOVER: 'discover-devices',
  GET_DEVICES: 'get-devices',
  TOGGLE_POWER: 'toggle-power',
  SET_BRIGHTNESS: 'set-brightness',
  SET_COLOR_TEMP: 'set-color-temperature',
  SET_COLOR: 'set-color',
  TOGGLE_DEVICE: 'toggle-device',
  SET_SCENE: 'set-scene',
  SET_DEFAULT: 'set-default',
  GET_SCENES: 'get-scenes-from-device',
  GET_GROUPS: 'get-groups-from-device'
}

// 云认证相关
const CloudAuth = {
  GET_AUTH_URL: 'cloud-get-authorization-url',
  GET_ACCESS_TOKEN: 'cloud-get-access-token',
  IS_AUTHENTICATED: 'cloud-is-authenticated',
  GET_AUTH_STATUS: 'cloud-get-auth-status',
  LOGOUT: 'cloud-logout'
}

// 云设备相关
const CloudDevice = {
  SYNC: 'cloud-sync-devices',
  GET_ALL: 'cloud-get-devices',
  GET_ONE: 'cloud-get-device',
  QUERY: 'cloud-query-devices',
  CONTROL: 'cloud-control-device',
  TOGGLE_POWER: 'cloud-toggle-power',
  SET_BRIGHTNESS: 'cloud-set-brightness',
  SET_COLOR_TEMP: 'cloud-set-color-temperature',
  SET_COLOR: 'cloud-set-color'
}

// 云房间相关
const CloudRoom = {
  SYNC: 'cloud-sync-rooms',
  GET_ALL: 'cloud-get-rooms',
  GET_ONE: 'cloud-get-room'
}

// 云分组相关
const CloudGroup = {
  SYNC: 'cloud-sync-groups',
  GET_ALL: 'cloud-get-groups',
  GET_ONE: 'cloud-get-group',
  CONTROL: 'cloud-control-group',
  TOGGLE_POWER: 'cloud-toggle-group-power'
}

// 云情景相关
const CloudScene = {
  SYNC: 'cloud-sync-scenes',
  GET_ALL: 'cloud-get-scenes',
  GET_ONE: 'cloud-get-scene',
  EXECUTE: 'cloud-execute-scene'
}

// 云自动化相关
const CloudAutomation = {
  SYNC: 'cloud-sync-automations',
  GET_ALL: 'cloud-get-automations',
  GET_ONE: 'cloud-get-automation',
  ENABLE: 'cloud-enable-automation',
  DISABLE: 'cloud-disable-automation'
}

// 同步相关
const Sync = {
  SYNC_NOW: 'cloud-sync-now',
  GET_STATUS: 'cloud-get-sync-status',
  SET_CONFIG: 'cloud-set-sync-config',
  GET_CONFIG: 'cloud-get-sync-config'
}

// 系统相关
const System = {
  OPEN_EXTERNAL: 'open-external',
  GET_APP_VERSION: 'get-app-version'
}

// 事件通道 (用于渲染进程 -> 主进程的单向通知)
const Events = {
  DEVICE_ADDED: 'device-added',
  DISCOVER_DONE: 'discover-done',
  DEVICE_UPDATED: 'device-updated',
  SCENE_APPLIED: 'scene-applied',
  SCENES_RECEIVED: 'scenes-received',
  CLOUD_DEVICES_SYNCED: 'cloud-devices-synced',
  CLOUD_DEVICE_UPDATED: 'cloud-device-updated',
  CLOUD_SYNC_ERROR: 'cloud-sync-error',
  CLOUD_AUTH_ERROR: 'cloud-auth-error',
  CLOUD_ROOMS_SYNCED: 'cloud-rooms-synced',
  CLOUD_GROUPS_SYNCED: 'cloud-groups-synced',
  CLOUD_SCENES_SYNCED: 'cloud-scenes-synced',
  CLOUD_SCENE_EXECUTED: 'cloud-scene-executed',
  CLOUD_AUTOMATIONS_SYNCED: 'cloud-automations-synced',
  CLOUD_AUTHENTICATED: 'cloud-authenticated',
  CLOUD_TOKEN_REFRESHED: 'cloud-token-refped',
  CLOUD_LOGOUT: 'cloud-logout',
  OAUTH_CALLBACK: 'oauth-callback'
}

module.exports = {
  LocalDevice,
  CloudAuth,
  CloudDevice,
  CloudRoom,
  CloudGroup,
  CloudScene,
  CloudAutomation,
  Sync,
  System,
  Events
}
