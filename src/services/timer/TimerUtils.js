/**
 * TimerUtils - 定时任务工具函数
 *
 * 功能:
 * - 计算下次触发时间
 * - 计算日出日落时间
 * - 解析时间字符串
 */

const path = require('path')
const fs = require('fs')

/**
 * 解析 HH:mm 格式的时间字符串
 * @param {string} timeStr - 时间字符串 (HH:mm)
 * @returns {Object} 解析结果 { hours, minutes, totalMinutes }
 */
function parseTimeString(timeStr) {
  const parts = timeStr.split(':')
  const hours = parseInt(parts[0], 10)
  const minutes = parseInt(parts[1], 10)

  return {
    hours,
    minutes,
    totalMinutes: hours * 60 + minutes
  }
}

/**
 * 计算下次触发时间
 * @param {Object} trigger - 触发配置
 * @returns {string|null} ISO 格式的下次触发时间，或 null (如果无法计算)
 */
function calculateNextTriggerTime(trigger) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  switch (trigger.type) {
    case 'once':
      return calculateOnceTrigger(trigger, now)

    case 'recurring':
      return calculateRecurringTrigger(trigger, today, currentMinutes)

    case 'sunrise':
    case 'sunset':
      return calculateSunTrigger(trigger, now, trigger.type)

    default:
      console.warn(`TimerUtils: 未知的触发类型: ${trigger.type}`)
      return null
  }
}

/**
 * 计算一次性定时任务的下次触发时间
 */
function calculateOnceTrigger(trigger, now) {
  if (!trigger.date || !trigger.time) {
    return null
  }

  const triggerDate = new Date(trigger.date + 'T' + trigger.time + ':00')
  const nowTime = now.getTime()

  if (triggerDate.getTime() > nowTime) {
    return triggerDate.toISOString()
  }

  return null // 已过期
}

/**
 * 计算重复定时任务的下次触发时间
 */
function calculateRecurringTrigger(trigger, today, currentMinutes) {
  const { time, repeatPattern, weekdays } = trigger

  if (!time) {
    return null
  }

  const { totalMinutes: triggerMinutes } = parseTimeString(time)

  // 如果今天还没到触发时间，返回今天
  if (currentMinutes < triggerMinutes) {
    return new Date(today.getTime() + triggerMinutes * 60 * 1000).toISOString()
  }

  // 查找下一个有效日期
  switch (repeatPattern) {
    case 'daily':
      // 明天
      return new Date(today.getTime() + 24 * 60 * 60 * 1000 + triggerMinutes * 60 * 1000).toISOString()

    case 'workday':
      // 工作日
      return findNextWorkday(today, triggerMinutes)

    case 'weekend':
      // 周末
      return findNextWeekend(today, triggerMinutes)

    case 'weekly':
      // 按星期
      return findNextWeekday(today, triggerMinutes, weekdays || [])

    case 'monthly':
      // 每月
      return findNextMonthly(today, triggerMinutes)

    default:
      return new Date(today.getTime() + 24 * 60 * 60 * 1000 + triggerMinutes * 60 * 1000).toISOString()
  }
}

/**
 * 查找下一个工作日
 */
function findNextWorkday(today, triggerMinutes) {
  for (let i = 1; i <= 7; i++) {
    const checkDate = new Date(today.getTime() + i * 24 * 60 * 60 * 1000)
    const dayOfWeek = checkDate.getDay()

    // 周一到周五 (1-5)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      return new Date(checkDate.getTime() + triggerMinutes * 60 * 1000).toISOString()
    }
  }
  return null
}

/**
 * 查找下一个周末
 */
function findNextWeekend(today, triggerMinutes) {
  for (let i = 1; i <= 7; i++) {
    const checkDate = new Date(today.getTime() + i * 24 * 60 * 60 * 1000)
    const dayOfWeek = checkDate.getDay()

    // 周六或周日 (0 或 6)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return new Date(checkDate.getTime() + triggerMinutes * 60 * 1000).toISOString()
    }
  }
  return null
}

/**
 * 查找下一个指定的星期几
 */
function findNextWeekday(today, triggerMinutes, weekdays) {
  if (!weekdays || weekdays.length === 0) {
    return new Date(today.getTime() + 24 * 60 * 60 * 1000 + triggerMinutes * 60 * 1000).toISOString()
  }

  for (let i = 1; i <= 7; i++) {
    const checkDate = new Date(today.getTime() + i * 24 * 60 * 60 * 1000)
    const dayOfWeek = checkDate.getDay()

    if (weekdays.includes(dayOfWeek)) {
      return new Date(checkDate.getTime() + triggerMinutes * 60 * 1000).toISOString()
    }
  }
  return null
}

/**
 * 查找下一个月的同一天
 */
function findNextMonthly(today, triggerMinutes) {
  const currentMonth = today.getMonth()
  const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1
  const currentYear = today.getFullYear()
  const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear

  // 获取今天在这个月的日期
  const dayOfMonth = today.getDate()

  // 尝试创建下个月的同一日期
  let nextDate = new Date(nextYear, nextMonth, dayOfMonth, 0, 0, 0)

  // 如果下个月的天数少于这个月的日期，取最后一天
  if (nextDate.getMonth() !== nextMonth) {
    nextDate = new Date(nextYear, nextMonth + 1, 0, 0, 0, 0)
  }

  return new Date(nextDate.getTime() + triggerMinutes * 60 * 1000).toISOString()
}

/**
 * 计算日出日落触发时间
 */
function calculateSunTrigger(trigger, now, type) {
  const { latitude = 39.9042, longitude = 116.4074, offsetMinutes = 0, timezone = 'Asia/Shanghai' } = trigger

  const sunTimes = calculateSunTimes(latitude, longitude)

  const targetTime = type === 'sunrise' ? sunTimes.sunrise : sunTimes.sunset

  // 应用偏移
  const triggerTime = new Date(targetTime.getTime() + offsetMinutes * 60 * 1000)

  // 如果已经过了今天的触发时间，返回明天的
  if (triggerTime.getTime() <= now.getTime()) {
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowSunTimes = calculateSunTimes(latitude, longitude, tomorrow)
    const tomorrowTargetTime = type === 'sunrise' ? tomorrowSunTimes.sunrise : tomorrowSunTimes.sunset
    return new Date(tomorrowTargetTime.getTime() + offsetMinutes * 60 * 1000).toISOString()
  }

  return triggerTime.toISOString()
}

/**
 * 计算日出日落时间
 * 使用简化的计算算法
 * @param {number} latitude - 纬度
 * @param {number} longitude - 经度
 * @param {Date} date - 计算日期 (默认为今天)
 * @returns {Object} 日出日落时间
 */
function calculateSunTimes(latitude, longitude, date = new Date()) {
  // 简化的日出日落计算算法
  const dayOfYear = getDayOfYear(date)
  const declination = 23.45 * Math.sin(degToRad(360 / 365 * (dayOfYear - 81)))
  const hourAngle = Math.acos(
    Math.cos(degToRad(90.833)) /
    (Math.cos(degToRad(latitude)) * Math.cos(degToRad(-declination))) -
    Math.tan(degToRad(latitude)) * Math.tan(degToRad(-declination))
  )

  // 日出时间 (UTC)
  const sunriseUTC = (720 - 4 * longitude - hourAngle * 180 / Math.PI) / 60
  // 日落时间 (UTC)
  const sunsetUTC = (720 - 4 * longitude + hourAngle * 180 / Math.PI) / 60

  // 转换为本地时间 (简化处理，假设北京时间 UTC+8)
  const timezoneOffset = 8
  const sunrise = new Date(date)
  sunrise.setUTCHours(Math.floor(sunriseUTC), (sunriseUTC % 1) * 60, 0, 0)

  const sunset = new Date(date)
  sunset.setUTCHours(Math.floor(sunsetUTC), (sunsetUTC % 1) * 60, 0, 0)

  // 修正为北京时间
  sunrise.setUTCHours(sunrise.getUTCHours() + timezoneOffset)
  sunset.setUTCHours(sunset.getUTCHours() + timezoneOffset)

  return {
    sunrise,
    sunset,
    solarNoon: new Date((sunrise.getTime() + sunset.getTime()) / 2),
    nadir: new Date(sunrise.getTime() - 12 * 60 * 60 * 1000)
  }
}

/**
 * 获取一年中的第几天
 */
function getDayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date - start
  const oneDay = 1000 * 60 * 60 * 24
  return Math.floor(diff / oneDay)
}

/**
 * 角度转弧度
 */
function degToRad(degrees) {
  return degrees * Math.PI / 180
}

/**
 * 格式化时间显示
 * @param {string} isoTime - ISO 时间字符串
 * @returns {string} 格式化的时间字符串
 */
function formatTimeDisplay(isoTime) {
  if (!isoTime) {
    return '-'
  }

  const date = new Date(isoTime)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return `${hours}:${minutes}`
}

/**
 * 格式化日期显示
 * @param {string} isoTime - ISO 时间字符串
 * @returns {string} 格式化的日期字符串
 */
function formatDateDisplay(isoTime) {
  if (!isoTime) {
    return '-'
  }

  const date = new Date(isoTime)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

/**
 * 获取相对时间描述
 * @param {string} isoTime - ISO 时间字符串
 * @returns {string} 相对时间描述
 */
function getRelativeTimeDescription(isoTime) {
  if (!isoTime) {
    return '已过期'
  }

  const now = new Date()
  const target = new Date(isoTime)
  const diffMs = target.getTime() - now.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMs < 0) {
    return '已过期'
  }

  if (diffMins < 1) {
    return '即将触发'
  }

  if (diffMins < 60) {
    return `${diffMins} 分钟后`
  }

  if (diffHours < 24) {
    return `${diffHours} 小时后`
  }

  if (diffDays === 1) {
    return '明天'
  }

  if (diffDays < 7) {
    return `${diffDays} 天后`
  }

  return formatDateDisplay(isoTime)
}

module.exports = {
  parseTimeString,
  calculateNextTriggerTime,
  calculateSunTimes,
  formatTimeDisplay,
  formatDateDisplay,
  getRelativeTimeDescription,
  getDayOfYear,
  degToRad
}
