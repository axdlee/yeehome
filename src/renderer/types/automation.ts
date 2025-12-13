/**
 * 自动化类型定义
 */

// 触发条件类型
export type TriggerType = 'time' | 'device_state' | 'manual'

// 时间触发条件
export interface TimeTrigger {
  type: 'time'
  time: string                  // HH:mm 格式
  repeat?: number[]             // 重复日期 (0-6, 0=周日)
}

// 设备状态触发条件
export interface DeviceStateTrigger {
  type: 'device_state'
  deviceId: string              // 设备ID
  property: string              // 属性名 (如 'power')
  operator: '==' | '!=' | '>' | '<' | '>=' | '<='
  value: any                    // 比较值
}

// 触发条件联合类型
export type Trigger = TimeTrigger | DeviceStateTrigger

// 自动化动作
export interface AutomationAction {
  deviceId: string              // 设备ID
  command: string               // 命令名称
  params: any[]                 // 命令参数
  delay?: number                // 延迟执行(ms)
}

// 自动化规则接口
export interface Automation {
  id: string                    // 自动化ID
  name: string                  // 自动化名称
  enabled: boolean              // 是否启用
  trigger: Trigger              // 触发条件
  actions: AutomationAction[]   // 执行动作列表
  createdAt?: Date              // 创建时间
  updatedAt?: Date              // 更新时间
  lastTriggered?: Date          // 最后触发时间
}

// 自动化表单数据
export interface AutomationFormData {
  name: string
  enabled?: boolean
  trigger: Trigger
  actions: AutomationAction[]
}
