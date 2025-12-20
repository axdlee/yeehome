/**
 * TimerManager - 设备定时任务管理器
 *
 * 功能:
 * - 定时任务的 CRUD 操作
 * - 定时任务的持久化存储
 * - 定时任务的调度和触发
 * - 支持一次性、重复、日出日落定时
 */

const EventEmitter = require('events')
const fs = require('fs')
const path = require('path')
const { calculateNextTriggerTime, calculateSunTimes } = require('./TimerUtils')

class TimerManager extends EventEmitter {
  constructor(options = {}) {
    super()

    // 配置
    this.dataDir = options.dataDir || path.join(process.cwd(), 'data')
    this.timersFile = options.timersFile || path.join(this.dataDir, 'timers.json')
    this.checkInterval = options.checkInterval || 1000 // 1秒检查一次

    // 状态
    this.timers = new Map()
    this.timerCheckInterval = null
    this.isRunning = false

    // 确保数据目录存在
    this.ensureDataDir()

    // 加载定时任务
    this.loadTimers()

    // 启动定时任务检查
    if (options.autoStart !== false) {
      this.start()
    }
  }

  /**
   * 确保数据目录存在
   */
  ensureDataDir() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true })
    }
  }

  /**
   * 加载定时任务
   */
  loadTimers() {
    try {
      if (fs.existsSync(this.timersFile)) {
        const data = fs.readFileSync(this.timersFile, 'utf8')
        const timersArray = JSON.parse(data)

        for (const timer of timersArray) {
          this.timers.set(timer.id, timer)
          // 重新计算下次触发时间
          if (timer.status === 'active') {
            const nextTriggerAt = calculateNextTriggerTime(timer.trigger)
            if (nextTriggerAt) {
              timer.nextTriggerAt = nextTriggerAt
            } else {
              timer.status = 'expired'
            }
          }
        }

        console.log(`TimerManager: 加载了 ${this.timers.size} 个定时任务`)
      }
    } catch (error) {
      console.error('TimerManager: 加载定时任务失败:', error)
    }
  }

  /**
   * 保存定时任务
   */
  saveTimers() {
    try {
      const timersArray = Array.from(this.timers.values())
      fs.writeFileSync(this.timersFile, JSON.stringify(timersArray, null, 2))
      console.log(`TimerManager: 保存了 ${timersArray.length} 个定时任务`)
    } catch (error) {
      console.error('TimerManager: 保存定时任务失败:', error)
      throw error
    }
  }

  /**
   * 创建定时任务
   * @param {Object} params - 创建参数
   * @returns {Object} 创建的定时任务
   */
  createTimer(params) {
    const now = new Date().toISOString()

    // 计算下次触发时间
    const nextTriggerAt = calculateNextTriggerTime(params.trigger)

    const timer = {
      id: this.generateId(),
      name: params.name,
      description: params.description || '',
      trigger: params.trigger,
      action: params.action,
      status: nextTriggerAt ? 'active' : 'expired',
      createdAt: now,
      updatedAt: now,
      nextTriggerAt: nextTriggerAt,
      triggerCount: 0,
      tags: params.tags || []
    }

    this.timers.set(timer.id, timer)
    this.saveTimers()

    console.log(`TimerManager: 创建定时任务 "${timer.name}" (${timer.id})`)

    // 触发事件
    this.emit('timerCreated', timer)

    return timer
  }

  /**
   * 获取定时任务
   * @param {string} timerId - 定时任务 ID
   * @returns {Object|null} 定时任务
   */
  getTimer(timerId) {
    return this.timers.get(timerId) || null
  }

  /**
   * 获取所有定时任务
   * @param {Object} query - 查询参数
   * @returns {Array} 定时任务数组
   */
  getTimers(query = {}) {
    let result = Array.from(this.timers.values())

    // 按状态过滤
    if (query.status) {
      const statuses = Array.isArray(query.status) ? query.status : [query.status]
      result = result.filter(t => statuses.includes(t.status))
    }

    // 按目标类型过滤
    if (query.targetType) {
      result = result.filter(t => t.action.targetId.startsWith(query.targetType + ':'))
    }

    // 按标签过滤
    if (query.tags && query.tags.length > 0) {
      result = result.filter(t =>
        query.tags.some(tag => t.tags?.includes(tag))
      )
    }

    // 按时间排序
    result.sort((a, b) => {
      if (a.status === 'active' && b.status === 'active') {
        return (a.nextTriggerAt || 0) - (b.nextTriggerAt || 0)
      }
      return a.status === 'active' ? -1 : 1
    })

    // 返回即将触发的定时
    if (query.upcoming) {
      result = result.filter(t => t.status === 'active' && t.nextTriggerAt)
      if (query.limit) {
        result = result.slice(0, query.limit)
      }
    }

    return result
  }

  /**
   * 更新定时任务
   * @param {string} timerId - 定时任务 ID
   * @param {Object} updates - 更新内容
   * @returns {Object|null} 更新后的定时任务
   */
  updateTimer(timerId, updates) {
    const timer = this.timers.get(timerId)
    if (!timer) {
      console.warn(`TimerManager: 定时任务不存在: ${timerId}`)
      return null
    }

    // 如果更新了 trigger，重新计算下次触发时间
    if (updates.trigger) {
      const nextTriggerAt = calculateNextTriggerTime(updates.trigger)
      updates.nextTriggerAt = nextTriggerAt
      if (nextTriggerAt && timer.status === 'expired') {
        updates.status = 'active'
      }
    }

    // 合并更新
    const updatedTimer = {
      ...timer,
      ...updates,
      id: timer.id, // 保持 ID 不变
      createdAt: timer.createdAt, // 保持创建时间不变
      updatedAt: new Date().toISOString()
    }

    this.timers.set(timerId, updatedTimer)
    this.saveTimers()

    console.log(`TimerManager: 更新定时任务 "${updatedTimer.name}"`)

    // 触发事件
    this.emit('timerUpdated', updatedTimer)

    return updatedTimer
  }

  /**
   * 删除定时任务
   * @param {string} timerId - 定时任务 ID
   * @returns {boolean} 是否成功删除
   */
  deleteTimer(timerId) {
    const timer = this.timers.get(timerId)
    if (!timer) {
      console.warn(`TimerManager: 定时任务不存在: ${timerId}`)
      return false
    }

    this.timers.delete(timerId)
    this.saveTimers()

    console.log(`TimerManager: 删除定时任务 "${timer.name}"`)

    // 触发事件
    this.emit('timerDeleted', timerId)

    return true
  }

  /**
   * 启用/暂停定时任务
   * @param {string} timerId - 定时任务 ID
   * @param {boolean} enabled - 是否启用
   * @returns {Object|null} 更新后的定时任务
   */
  setTimerEnabled(timerId, enabled) {
    const timer = this.timers.get(timerId)
    if (!timer) {
      return null
    }

    if (enabled) {
      const nextTriggerAt = calculateNextTriggerTime(timer.trigger)
      if (nextTriggerAt) {
        return this.updateTimer(timerId, {
          status: 'active',
          nextTriggerAt
        })
      } else {
        console.warn(`TimerManager: 无法启用定时任务 "${timer.name}": 无效的触发条件`)
        return null
      }
    } else {
      return this.updateTimer(timerId, {
        status: 'paused',
        nextTriggerAt: null
      })
    }
  }

  /**
   * 手动触发定时任务
   * @param {string} timerId - 定时任务 ID
   * @returns {boolean} 是否成功触发
   */
  triggerTimer(timerId) {
    const timer = this.timers.get(timerId)
    if (!timer) {
      console.warn(`TimerManager: 定时任务不存在: ${timerId}`)
      return false
    }

    console.log(`TimerManager: 手动触发定时任务 "${timer.name}"`)

    // 执行定时任务动作
    this.executeTimerAction(timer)

    // 更新触发信息
    const now = new Date().toISOString()
    this.updateTimer(timerId, {
      lastTriggeredAt: now,
      triggerCount: timer.triggerCount + 1
    })

    // 如果是一次性定时，标记为完成
    if (timer.trigger.type === 'once') {
      this.updateTimer(timerId, {
        status: 'completed',
        nextTriggerAt: null
      })
    } else {
      // 重新计算下次触发时间
      const nextTriggerAt = calculateNextTriggerTime(timer.trigger)
      this.updateTimer(timerId, { nextTriggerAt })
    }

    return true
  }

  /**
   * 执行定时任务动作
   * @param {Object} timer - 定时任务
   */
  executeTimerAction(timer) {
    console.log(`TimerManager: 执行定时任务 "${timer.name}" - 动作: ${timer.action.type}`)

    // 触发执行事件，由主进程或其他服务处理实际设备控制
    this.emit('timerTriggered', {
      timerId: timer.id,
      timerName: timer.name,
      action: timer.action,
      triggeredAt: new Date().toISOString()
    })
  }

  /**
   * 启动定时任务检查
   */
  start() {
    if (this.isRunning) {
      return
    }

    this.isRunning = true
    this.timerCheckInterval = setInterval(() => {
      this.checkTimers()
    }, this.checkInterval)

    console.log('TimerManager: 定时任务检查已启动')

    // 立即检查一次
    this.checkTimers()
  }

  /**
   * 停止定时任务检查
   */
  stop() {
    if (!this.isRunning) {
      return
    }

    if (this.timerCheckInterval) {
      clearInterval(this.timerCheckInterval)
      this.timerCheckInterval = null
    }

    this.isRunning = false
    console.log('TimerManager: 定时任务检查已停止')
  }

  /**
   * 检查定时任务
   */
  checkTimers() {
    const now = Date.now()

    for (const timer of this.timers.values()) {
      if (timer.status !== 'active') {
        continue
      }

      if (!timer.nextTriggerAt) {
        continue
      }

      // 检查是否到达触发时间
      if (now >= new Date(timer.nextTriggerAt).getTime()) {
        this.triggerTimer(timer.id)
      }
    }
  }

  /**
   * 获取即将触发的定时任务
   * @param {number} limit - 返回数量限制
   * @returns {Array} 即将触发的定时任务
   */
  getUpcomingTimers(limit = 10) {
    return this.getTimers({
      status: 'active',
      upcoming: true,
      limit
    })
  }

  /**
   * 获取定时任务统计
   * @returns {Object} 统计信息
   */
  getStats() {
    const timers = Array.from(this.timers.values())

    return {
      total: timers.length,
      active: timers.filter(t => t.status === 'active').length,
      paused: timers.filter(t => t.status === 'paused').length,
      expired: timers.filter(t => t.status === 'expired').length,
      completed: timers.filter(t => t.status === 'completed').length,
      byType: {
        once: timers.filter(t => t.trigger.type === 'once').length,
        recurring: timers.filter(t => t.trigger.type === 'recurring').length,
        sunrise: timers.filter(t => t.trigger.type === 'sunrise').length,
        sunset: timers.filter(t => t.trigger.type === 'sunset').length
      }
    }
  }

  /**
   * 生成唯一 ID
   * @returns {string} 唯一 ID
   */
  generateId() {
    return 'timer_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9)
  }

  /**
   * 清理资源
   */
  cleanup() {
    this.stop()
    this.timers.clear()
    console.log('TimerManager: 资源已清理')
  }
}

module.exports = TimerManager
