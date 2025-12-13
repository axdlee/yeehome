/**
 * 设备类型定义
 */

// 设备来源
export type DeviceSource = 'local' | 'cloud'

// 设备类型
export type DeviceType =
  | 'mono'        // 单色灯
  | 'color'       // 彩色灯
  | 'stripe'      // 灯带
  | 'ceiling'     // 吸顶灯
  | 'bslamp'      // 床头灯
  | 'ct_bulb'     // 色温灯
  | 'ceiling1'    // 吸顶灯1代
  | 'ceiling4'    // 吸顶灯4代

// 电源状态
export type PowerState = 'on' | 'off'

// 颜色模式: 1=RGB, 2=色温, 3=HSV
export type ColorMode = 1 | 2 | 3

// 设备接口
export interface Device {
  // 基本信息
  id: string                    // 设备唯一标识
  name: string                  // 设备名称
  model: DeviceType             // 设备型号
  source: DeviceSource          // 设备来源 (本地/云端)
  location?: string             // 设备位置 (yeelight://IP:PORT)

  // 状态信息
  power: PowerState             // 电源状态
  bright: number                // 亮度 (1-100)
  ct?: number                   // 色温 (1700-6500K)
  rgb?: number                  // RGB值 (0-16777215)
  hue?: number                  // 色相 (0-359)
  sat?: number                  // 饱和度 (0-100)
  color_mode?: ColorMode        // 当前颜色模式

  // 能力信息
  support: string[]             // 支持的方法列表

  // 背景灯 (部分设备支持)
  bg_power?: PowerState
  bg_bright?: number
  bg_ct?: number
  bg_rgb?: number
  bg_hue?: number
  bg_sat?: number

  // 元数据
  fw_ver?: string               // 固件版本
  connected: boolean            // 是否已连接
  lastSeen?: Date               // 最后在线时间

  // 云端特有字段
  online?: boolean              // 在线状态 (云端)
  offline_at?: number           // 离线时间戳 (云端)
}

// 设备命令接口
export interface DeviceCommand {
  method: string                // 方法名
  params: any[]                 // 参数数组
}

// 设备控制响应
export interface DeviceCommandResult {
  id: number                    // 命令ID
  result?: string[]             // 成功结果
  error?: {                     // 错误信息
    code: number
    message: string
  }
}

// 设备特性
export interface DeviceFeature {
  name: string                  // 特性名称
  support: boolean              // 是否支持
  icon?: string                 // 图标名称
}

// 设备过滤器
export interface DeviceFilter {
  source?: DeviceSource         // 按来源过滤
  power?: PowerState            // 按电源状态过滤
  type?: DeviceType             // 按类型过滤
  keyword?: string              // 关键字搜索
}

// 设备控制参数
export interface DeviceControlParams {
  deviceId: string
  command: DeviceCommand
  source: DeviceSource
}

// 设备发现事件
export interface DeviceDiscoveryEvent {
  type: 'added' | 'updated' | 'removed'
  device: Device
}
