/**
 * 情景类型定义
 */

// 情景动作类型
export type SceneActionType = 'power' | 'brightness' | 'color_temp' | 'rgb' | 'delay'

// 情景动作
export interface SceneAction {
  deviceId: string              // 设备ID
  type: SceneActionType         // 动作类型
  value: any                    // 动作值
  delay?: number                // 延迟执行(ms)
}

// 情景接口
export interface Scene {
  id: string                    // 情景ID
  name: string                  // 情景名称
  icon?: string                 // 情景图标
  actions: SceneAction[]        // 动作列表
  createdAt?: Date              // 创建时间
  updatedAt?: Date              // 更新时间
}

// 情景表单数据
export interface SceneFormData {
  name: string
  icon?: string
  actions: SceneAction[]
}
