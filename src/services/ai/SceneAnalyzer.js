/**
 * SceneAnalyzer - 场景分析器
 *
 * 功能：
 * - 分析当前上下文（时间、设备状态、天气等）
 * - 识别用户行为模式
 * - 评估场景适用性
 */

const { calculateSunTimes } = require('../timer/TimerUtils')

/**
 * 根据时间获取时间段
 * @param {Date} date - 日期对象
 * @returns {string} 时间段
 */
function getTimeOfDay(date) {
  const hour = date.getHours()

  if (hour >= 5 && hour < 7) return 'dawn'
  if (hour >= 7 && hour < 10) return 'morning'
  if (hour >= 10 && hour < 13) return 'noon'
  if (hour >= 13 && hour < 18) return 'afternoon'
  if (hour >= 18 && hour < 21) return 'evening'
  if (hour >= 21 && hour < 24) return 'night'
  return 'midnight'
}

/**
 * 检查时间范围
 * @param {string} currentTime - 当前时间 HH:mm
 * @param {string} startTime - 开始时间 HH:mm
 * @param {string} endTime - 结束时间 HH:mm
 * @returns {boolean} 是否在时间范围内
 */
function isInTimeRange(currentTime, startTime, endTime) {
  const [currH, currM] = currentTime.split(':').map(Number)
  const [startH, startM] = startTime.split(':').map(Number)
  const [endH, endM] = endTime.split(':').map(Number)

  const current = currH * 60 + currM
  const start = startH * 60 + startM
  const end = endH * 60 + endM

  if (start <= end) {
    return current >= start && current <= end
  } else {
    // 跨午夜
    return current >= start || current <= end
  }
}

/**
 * 分析设备状态
 * @param {Object} device - 设备对象
 * @returns {Object} 分析结果
 */
function analyzeDeviceState(device) {
  const result = {
    isOn: device.power === 'on',
    brightness: device.brightness || 0,
    colorTemp: device.colorTemp || 0,
    rgb: device.rgb || 0,
    isOnline: device.connected !== false,
    supportsColor: device.supports?.color || device.model?.includes('color'),
    supportsCt: device.supports?.colorTemp || device.model?.includes('ct') || device.model?.includes('bulb'),
    supportsBrightness: device.supports?.brightness || device.model?.includes('bulb')
  }

  return result
}

/**
 * 计算场景匹配度
 * @param {Object} scene - 场景对象
 * @param {Object} context - 推荐上下文
 * @param {Array} devices - 设备列表
 * @returns {number} 匹配度 0-100
 */
function calculateSceneMatchScore(scene, context, devices) {
  let score = 50 // 基础分数

  // 检查时间段匹配
  const timeConditions = scene.trigger?.conditions?.filter(c => c.type === 'time_range') || []
  const currentTime = new Date()
  const timeStr = `${String(currentTime.getHours()).padStart(2, '0')}:${String(currentTime.getMinutes()).padStart(2, '0')}`

  for (const condition of timeConditions) {
    if (isInTimeRange(timeStr, condition.startTime, condition.endTime)) {
      score += 20
    } else if (condition.daysOfWeek?.length > 0) {
      // 检查星期
      if (condition.daysOfWeek.includes(currentTime.getDay())) {
        score += 10
      }
    }
  }

  // 检查设备条件匹配
  const deviceConditions = scene.trigger?.conditions?.filter(c => c.type === 'device_state') || []
  for (const condition of deviceConditions) {
    const device = devices.find(d => d.id === condition.deviceId)
    if (device) {
      const state = analyzeDeviceState(device)
      const propValue = state[condition.property]
      if (propValue !== undefined) {
        if (evaluateCondition(propValue, condition.operator, condition.value)) {
          score += 15
        }
      }
    }
  }

  // 根据时间段调整分数
  const timeOfDayScores = {
    dawn: ['morning_routine', 'energy_saving'],
    morning: ['morning_routine', 'work_from_home', 'focus'],
    noon: ['work_from_home', 'focus'],
    afternoon: ['work_from_home', 'focus', 'relax'],
    evening: ['movie_time', 'reading', 'romantic', 'party'],
    night: ['night_routine', 'relax'],
    midnight: ['night_routine']
  }

  const preferredTypes = timeOfDayScores[context.timeOfDay] || []
  if (preferredTypes.includes(scene.type)) {
    score += 20
  }

  // 设备数量要求
  if (scene.conditions?.minDevices) {
    if (devices.length >= scene.conditions.minDevices) {
      score += 10
    } else {
      score -= 10
    }
  }

  // 排除某些设备类型
  if (scene.conditions?.excludedDeviceTypes) {
    const hasExcluded = devices.some(d =>
      scene.conditions.excludedDeviceTypes.some(type => d.model?.includes(type))
    )
    if (hasExcluded) {
      score -= 20
    }
  }

  // 满意度分数
  score += (scene.satisfactionScore - 50) * 0.3

  return Math.max(0, Math.min(100, Math.round(score)))
}

/**
 * 评估条件
 */
function evaluateCondition(value, operator, target) {
  switch (operator) {
    case 'eq': return value === target
    case 'ne': return value !== target
    case 'gt': return value > target
    case 'lt': return value < target
    case 'gte': return value >= target
    case 'lte': return value <= target
    default: return false
  }
}

/**
 * 分析当前上下文
 * @param {Array} devices - 设备列表
 * @param {Object} options - 选项
 * @returns {Object} 上下文对象
 */
function analyzeCurrentContext(devices, options = {}) {
  const now = new Date()
  const { weather, location } = options

  // 计算日出日落时间
  const latitude = 39.9042 // 默认北京
  const longitude = 116.4074
  const sunTimes = calculateSunTimes(latitude, longitude, now)

  // 判断当前是否在日出日落附近
  const timeSinceSunrise = (now - sunTimes.sunrise) / (1000 * 60) // 分钟
  const timeUntilSunset = (sunTimes.sunset - now) / (1000 * 60)

  return {
    timeOfDay: getTimeOfDay(now),
    dayOfWeek: now.getDay(),
    isWeekend: now.getDay() === 0 || now.getDay() === 6,
    isNearSunrise: Math.abs(timeSinceSunrise) < 30,
    isNearSunset: Math.abs(timeUntilSunset) < 30,
    sunrise: sunTimes.sunrise,
    sunset: sunTimes.sunset,
    weather: weather || null,
    location: location || null,
    deviceCount: devices.length,
    onlineDeviceCount: devices.filter(d => d.connected !== false).length,
    poweredOnCount: devices.filter(d => d.power === 'on').length,
    averageBrightness: devices.length > 0
      ? devices.reduce((sum, d) => sum + (d.brightness || 0), 0) / devices.length
      : 0,
    deviceStates: devices.reduce((map, d) => {
      map[d.id] = analyzeDeviceState(d)
      return map
    }, {})
  }
}

/**
 * 识别当前活动
 * @param {Object} context - 上下文
 * @param {Array} devices - 设备列表
 * @returns {string|null} 识别出的活动
 */
function recognizeCurrentActivity(context, devices) {
  const { timeOfDay, poweredOnCount, averageBrightness, isNearSunset } = context

  // 早间模式
  if (timeOfDay === 'dawn' || timeOfDay === 'morning') {
    if (poweredOnCount > 0 && averageBrightness < 50) {
      return 'morning_routine'
    }
  }

  // 离家模式检测（工作时间设备全关）
  if ((timeOfDay === 'morning' || timeOfDay === 'noon' || timeOfDay === 'afternoon') &&
      poweredOnCount === 0 && context.deviceCount > 0) {
    return 'leave_home'
  }

  // 回家模式检测
  if (context.location?.isHome && poweredOnCount === 0 && context.deviceCount > 0) {
    return 'arrive_home'
  }

  // 观影模式（傍晚低亮度）
  if ((timeOfDay === 'evening' || timeOfDay === 'night') &&
      poweredOnCount > 0 && averageBrightness < 30) {
    return 'movie_time'
  }

  // 夜间模式
  if (timeOfDay === 'night' || timeOfDay === 'midnight') {
    if (poweredOnCount > 0 && averageBrightness < 20) {
      return 'night_routine'
    }
  }

  // 工作模式
  if ((timeOfDay === 'morning' || timeOfDay === 'afternoon') &&
      poweredOnCount > context.deviceCount * 0.5 && averageBrightness > 70) {
    return 'work_from_home'
  }

  return null
}

/**
 * 生成推荐理由
 * @param {Object} scene - 场景
 * @param {Object} context - 上下文
 * @returns {string} 理由描述
 */
function generateRecommendationReason(scene, context) {
  const reasons = []

  const timeOfDayReasons = {
    dawn: '清晨时光，适合启动新的一天',
    morning: '上午时间，工作或学习的好时机',
    noon: '午间休息，可以放松一下',
    afternoon: '下午时段，保持专注或开始放松',
    evening: '傍晚来临，是放松娱乐的时间',
    night: '夜幕降临，准备休息',
    midnight: '深夜时分，注意休息'
  }

  if (timeOfDayReasons[context.timeOfDay]) {
    reasons.push(timeOfDayReasons[context.timeOfDay])
  }

  if (context.isNearSunset) {
    reasons.push('日落时分，灯光可以配合调整')
  }

  if (context.isWeekend) {
    reasons.push('周末时光，可以尝试不同的场景')
  }

  if (context.poweredOnCount === 0) {
    reasons.push('当前设备未开启，建议开启场景')
  } else if (context.poweredOnCount > 0) {
    reasons.push('可以调整当前设备状态')
  }

  // 根据场景类型添加特定理由
  const sceneTypeReasons = {
    morning_routine: '美好的一天从舒适的晨光开始',
    night_routine: '夜间模式让睡眠更舒适',
    leave_home: '离家时自动关闭灯光节省能源',
    arrive_home: '回家时自动开启灯光迎接您',
    movie_time: '观影模式营造沉浸式体验',
    reading: '阅读模式保护视力',
    work_from_home: '工作模式提升效率',
    party: '派对模式增添氛围',
    romantic: '浪漫模式营造温馨氛围',
    energy_saving: '节能模式帮您降低电费',
    focus: '专注模式提升工作效率',
    relax: '放松模式帮助您舒缓压力'
  }

  if (sceneTypeReasons[scene.type]) {
    reasons.push(sceneTypeReasons[scene.type])
  }

  return reasons.join('，') + '。'
}

module.exports = {
  getTimeOfDay,
  isInTimeRange,
  analyzeDeviceState,
  calculateSceneMatchScore,
  analyzeCurrentContext,
  recognizeCurrentActivity,
  generateRecommendationReason,
  evaluateCondition
}
