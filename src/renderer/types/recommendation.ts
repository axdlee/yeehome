/**
 * AI场景推荐类型定义
 */

/**
 * 推荐类型
 */
export type RecommendationType =
  | 'morning_routine'    // 早间routine
  | 'night_routine'      // 晚间routine
  | 'leave_home'         // 离家模式
  | 'arrive_home'        // 回家模式
  | 'movie_time'         // 观影时间
  | 'reading'            // 阅读模式
  | 'work_from_home'     // 在家办公
  | 'party'              // 派对模式
  | 'romantic'           // 浪漫模式
  | 'energy_saving'      // 节能模式
  | 'focus'              // 专注模式
  | 'relax'              // 放松模式
  | 'custom'             // 自定义推荐

/**
 * 推荐优先级
 */
export type RecommendationPriority = 'high' | 'medium' | 'low'

/**
 * 触发条件类型
 */
export type TriggerCondition =
  | 'time_range'         // 时间范围
  | 'device_state'       // 设备状态
  | 'weather'            // 天气
  | 'location'           // 位置（需要位置服务）
  | 'user_activity'      // 用户活动
  | 'manual'             // 手动触发

/**
 * 时间范围条件
 */
export interface TimeRangeCondition {
  type: 'time_range'
  startTime: string      // HH:mm 格式
  endTime: string
  daysOfWeek?: number[]  // 0-6，周日到周六
}

/**
 * 设备状态条件
 */
export interface DeviceStateCondition {
  type: 'device_state'
  deviceId: string
  property: string
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte'
  value: any
}

/**
 * 天气条件
 */
export interface WeatherCondition {
  type: 'weather'
  condition: 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'snowy' | 'foggy' | 'windy'
  temperatureRange?: { min: number; max: number }
}

/**
 * 推荐触发条件
 */
export interface RecommendationTrigger {
  conditions: Array<
    TimeRangeCondition |
    DeviceStateCondition |
    WeatherCondition
  >
  logicalOperator: 'and' | 'or'
}

/**
 * 推荐动作
 */
export interface RecommendationAction {
  deviceId: string
  action: string
  params?: Record<string, any>
  transitionMs?: number
}

/**
 * 推荐场景
 */
export interface RecommendationScene {
  id: string
  name: string
  description: string
  type: RecommendationType
  priority: RecommendationPriority
  icon: string
  color: string
  trigger: RecommendationTrigger
  actions: RecommendationAction[]
  conditions?: {
    minDevices?: number
    requiredCapabilities?: string[]
    excludedDeviceTypes?: string[]
  }
  usageCount: number
  satisfactionScore: number
  createdAt: string
  updatedAt: string
}

/**
 * 推荐上下文
 */
export interface RecommendationContext {
  timeOfDay: 'dawn' | 'morning' | 'noon' | 'afternoon' | 'evening' | 'night' | 'midnight'
  dayOfWeek: number
  isWeekend: boolean
  weather?: {
    condition: string
    temperature: number
    humidity: number
  }
  location?: {
    isHome: boolean
    distanceFromHome?: number
  }
  recentDeviceStates: Map<string, Record<string, any>>
  userBehaviorHistory: UserBehaviorEntry[]
}

/**
 * 用户行为记录
 */
export interface UserBehaviorEntry {
  timestamp: string
  action: string
  deviceId?: string
  sceneId?: string
  duration?: number
  context?: Record<string, any>
}

/**
 * 推荐结果
 */
export interface RecommendationResult {
  recommendations: RecommendationScene[]
  reason: string
  context: RecommendationContext
  generatedAt: string
}

/**
 * 用户偏好设置
 */
export interface UserPreferences {
  preferredScenes: string[]
  dislikedScenes: string[]
  autoApplyEnabled: boolean
  notificationEnabled: boolean
  quietHours?: {
    enabled: boolean
    startTime: string
    endTime: string
  }
  energySavingPriority: 'high' | 'medium' | 'low'
  comfortPriority: 'high' | 'medium' | 'low'
}

/**
 * 场景模板
 */
export interface SceneTemplate {
  id: string
  name: string
  description: string
  type: RecommendationType
  defaultActions: RecommendationAction[]
  defaultTrigger: RecommendationTrigger
  icon: string
  color: string
}
