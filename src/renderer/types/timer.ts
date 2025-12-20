/**
 * 定时任务类型定义
 */

/**
 * 定时任务类型
 */
export type TimerType = 'once' | 'recurring' | 'sunrise' | 'sunset'

/**
 * 重复周期
 */
export type RepeatPattern = 'daily' | 'weekly' | 'monthly' | 'workday' | 'weekend'

/**
 * 目标类型
 */
export type TimerTargetType = 'device' | 'group' | 'scene' | 'room'

/**
 * 操作类型
 */
export type TimerAction = 'on' | 'off' | 'toggle' | 'brightness' | 'color' | 'scene' | 'ct'

/**
 * 定时任务状态
 */
export type TimerStatus = 'active' | 'paused' | 'expired' | 'completed'

/**
 * 星期掩码 (0=周日, 1=周一, ..., 6=周六)
 */
export type WeekdayMask = 0 | 1 | 2 | 3 | 4 | 5 | 6

/**
 * 星期掩码数组
 */
export type WeekdayMaskArray = WeekdayMask[]

/**
 * 定时任务触发条件
 */
export interface TimerTrigger {
  type: TimerType
  /** 触发时间 (用于 once 和 recurring) */
  time?: string // HH:mm 格式
  /** 触发日期 (用于 once) */
  date?: string // YYYY-MM-DD 格式
  /** 重复模式 (用于 recurring) */
  repeatPattern?: RepeatPattern
  /** 星期掩码 (用于 weekly) */
  weekdays?: WeekdayMaskArray
  /** 偏移分钟数 (用于 sunrise/sunset, 可正可负) */
  offsetMinutes?: number
  /** 纬度 (用于 sunrise/sunset 计算) */
  latitude?: number
  /** 经度 (用于 sunrise/sunset 计算) */
  longitude?: number
  /** 时区 */
  timezone?: string
}

/**
 * 定时任务执行动作
 */
export interface TimerActionConfig {
  /** 操作类型 */
  type: TimerAction
  /** 目标 ID (设备ID/组ID/情景ID) */
  targetId: string
  /** 操作参数 */
  params?: {
    /** 亮度值 (1-100) */
    brightness?: number
    /** 色温值 (1700-6500) */
    colorTemp?: number
    /** RGB 颜色值 */
    rgb?: number
    /** 情景 ID (仅 type=scene 时使用) */
    sceneId?: string
  }
  /** 渐变时间 (毫秒) */
  transitionMs?: number
}

/**
 * 定时任务
 */
export interface Timer {
  /** 定时任务 ID */
  id: string
  /** 定时任务名称 */
  name: string
  /** 定时任务描述 */
  description?: string
  /** 触发条件 */
  trigger: TimerTrigger
  /** 执行动作 */
  action: TimerActionConfig
  /** 状态 */
  status: TimerStatus
  /** 创建时间 */
  createdAt: string
  /** 更新时间 */
  updatedAt: string
  /** 最后触发时间 */
  lastTriggeredAt?: string
  /** 下次触发时间 */
  nextTriggerAt?: string
  /** 触发次数 */
  triggerCount: number
  /** 标签 */
  tags?: string[]
}

/**
 * 创建定时任务参数
 */
export interface CreateTimerParams {
  name: string
  description?: string
  trigger: TimerTrigger
  action: TimerActionConfig
  tags?: string[]
}

/**
 * 更新定时任务参数
 */
export interface UpdateTimerParams {
  name?: string
  description?: string
  trigger?: TimerTrigger
  action?: TimerActionConfig
  status?: TimerStatus
  nextTriggerAt?: string | null
  tags?: string[]
}

/**
 * 定时任务查询参数
 */
export interface TimerQuery {
  status?: TimerStatus | TimerStatus[]
  targetType?: TimerTargetType
  targetId?: string
  tags?: string[]
  /** 是否只返回即将触发的定时 */
  upcoming?: boolean
  /** 即将触发的定时数量限制 */
  limit?: number
}

/**
 * 定时任务摘要 (用于列表展示)
 */
export interface TimerSummary {
  id: string
  name: string
  triggerTime: string
  actionDescription: string
  status: TimerStatus
  nextTriggerAt?: string
}

/**
 * 日出日落时间计算结果
 */
export interface SunTimes {
  sunrise: Date
  sunset: Date
  solarNoon: Date
  nadir: Date
}
