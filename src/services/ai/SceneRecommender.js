/**
 * SceneRecommender - AI场景推荐器
 *
 * 功能：
 * - 基于上下文生成场景推荐
 * - 学习用户行为模式
 * - 智能排序和筛选推荐
 */

const EventEmitter = require('events')
const {
  analyzeCurrentContext,
  recognizeCurrentActivity,
  generateRecommendationReason,
  calculateSceneMatchScore,
  getTimeOfDay
} = require('./SceneAnalyzer')

/**
 * 默认场景模板
 */
const DEFAULT_SCENE_TEMPLATES = [
  {
    id: 'morning_routine',
    name: '早间模式',
    description: '轻柔的灯光唤醒美好的一天',
    type: 'morning_routine',
    priority: 'high',
    icon: 'Sunrise',
    color: '#FFB74D',
    trigger: {
      conditions: [
        { type: 'time_range', startTime: '06:00', endTime: '08:00', daysOfWeek: [1, 2, 3, 4, 5] }
      ],
      logicalOperator: 'and'
    },
    actions: [
      { deviceId: 'all', action: 'on', params: { brightness: 30 }, transitionMs: 5000 },
      { deviceId: 'all', action: 'brightness', params: { brightness: 80 }, transitionMs: 300000 }
    ],
    conditions: { minDevices: 1 },
    usageCount: 0,
    satisfactionScore: 75
  },
  {
    id: 'night_routine',
    name: '夜间模式',
    description: '温馨的灯光伴您入睡',
    type: 'night_routine',
    priority: 'high',
    icon: 'Moon',
    color: '#5C6BC0',
    trigger: {
      conditions: [
        { type: 'time_range', startTime: '21:00', endTime: '23:59' }
      ],
      logicalOperator: 'and'
    },
    actions: [
      { deviceId: 'all', action: 'brightness', params: { brightness: 20 }, transitionMs: 5000 },
      { deviceId: 'all', action: 'ct', params: { colorTemp: 2700 }, transitionMs: 5000 }
    ],
    conditions: { minDevices: 1 },
    usageCount: 0,
    satisfactionScore: 80
  },
  {
    id: 'leave_home',
    name: '离家模式',
    description: '离开家时自动关闭所有灯光',
    type: 'leave_home',
    priority: 'high',
    icon: 'Lock',
    color: '#EF5350',
    trigger: {
      conditions: [
        { type: 'time_range', startTime: '07:00', endTime: '20:00', daysOfWeek: [1, 2, 3, 4, 5] }
      ],
      logicalOperator: 'and'
    },
    actions: [
      { deviceId: 'all', action: 'off' }
    ],
    conditions: { minDevices: 1, excludedDeviceTypes: ['strip'] },
    usageCount: 0,
    satisfactionScore: 85
  },
  {
    id: 'arrive_home',
    name: '回家模式',
    description: '回到家时自动开启灯光',
    type: 'arrive_home',
    priority: 'high',
    icon: 'Key',
    color: '#66BB6A',
    trigger: {
      conditions: [],
      logicalOperator: 'and'
    },
    actions: [
      { deviceId: 'all', action: 'on', params: { brightness: 60 } }
    ],
    conditions: { minDevices: 1 },
    usageCount: 0,
    satisfactionScore: 82
  },
  {
    id: 'movie_time',
    name: '观影模式',
    description: '营造沉浸式观影体验',
    type: 'movie_time',
    priority: 'medium',
    icon: 'VideoCamera',
    color: '#7E57C2',
    trigger: {
      conditions: [
        { type: 'time_range', startTime: '19:00', endTime: '23:00' }
      ],
      logicalOperator: 'and'
    },
    actions: [
      { deviceId: 'all', action: 'brightness', params: { brightness: 10 }, transitionMs: 3000 },
      { deviceId: 'all', action: 'color', params: { rgb: 255 << 16 | 100 << 8 | 50 } }
    ],
    conditions: { minDevices: 2 },
    usageCount: 0,
    satisfactionScore: 78
  },
  {
    id: 'reading',
    name: '阅读模式',
    description: '护眼舒适的阅读灯光',
    type: 'reading',
    priority: 'medium',
    icon: 'Book',
    color: '#42A5F5',
    trigger: {
      conditions: [],
      logicalOperator: 'and'
    },
    actions: [
      { deviceId: 'all', action: 'brightness', params: { brightness: 80 }, transitionMs: 2000 },
      { deviceId: 'all', action: 'ct', params: { colorTemp: 5000 }, transitionMs: 2000 }
    ],
    conditions: { minDevices: 1 },
    usageCount: 0,
    satisfactionScore: 75
  },
  {
    id: 'work_from_home',
    name: '工作模式',
    description: '提升工作效率的灯光',
    type: 'work_from_home',
    priority: 'medium',
    icon: 'Monitor',
    color: '#26A69A',
    trigger: {
      conditions: [
        { type: 'time_range', startTime: '09:00', endTime: '18:00', daysOfWeek: [1, 2, 3, 4, 5] }
      ],
      logicalOperator: 'and'
    },
    actions: [
      { deviceId: 'all', action: 'brightness', params: { brightness: 90 }, transitionMs: 2000 },
      { deviceId: 'all', action: 'ct', params: { colorTemp: 5500 } }
    ],
    conditions: { minDevices: 1 },
    usageCount: 0,
    satisfactionScore: 72
  },
  {
    id: 'party',
    name: '派对模式',
    description: '多彩灯光营造派对氛围',
    type: 'party',
    priority: 'low',
    icon: 'Party',
    color: '#EC407A',
    trigger: {
      conditions: [],
      logicalOperator: 'and'
    },
    actions: [
      { deviceId: 'all', action: 'color', params: { rgb: 0xFF0000 }, transitionMs: 1000 },
      { deviceId: 'all', action: 'toggle', transitionMs: 500 }
    ],
    conditions: { minDevices: 3 },
    usageCount: 0,
    satisfactionScore: 68
  },
  {
    id: 'romantic',
    name: '浪漫模式',
    description: '温馨浪漫的二人时光',
    type: 'romantic',
    priority: 'low',
    icon: 'Heart',
    color: '#F06292',
    trigger: {
      conditions: [],
      logicalOperator: 'and'
    },
    actions: [
      { deviceId: 'all', action: 'brightness', params: { brightness: 30 }, transitionMs: 3000 },
      { deviceId: 'all', action: 'color', params: { rgb: 0xFF6B6B }, transitionMs: 3000 }
    ],
    conditions: { minDevices: 1 },
    usageCount: 0,
    satisfactionScore: 70
  },
  {
    id: 'energy_saving',
    name: '节能模式',
    description: '降低能耗，绿色生活',
    type: 'energy_saving',
    priority: 'medium',
    icon: 'Leaf',
    color: '#8BC34A',
    trigger: {
      conditions: [],
      logicalOperator: 'and'
    },
    actions: [
      { deviceId: 'all', action: 'brightness', params: { brightness: 40 }, transitionMs: 5000 }
    ],
    conditions: { minDevices: 1 },
    usageCount: 0,
    satisfactionScore: 76
  },
  {
    id: 'focus',
    name: '专注模式',
    description: '帮助集中注意力的灯光',
    type: 'focus',
    priority: 'medium',
    icon: 'Aim',
    color: '#29B6F6',
    trigger: {
      conditions: [],
      logicalOperator: 'and'
    },
    actions: [
      { deviceId: 'all', action: 'brightness', params: { brightness: 100 }, transitionMs: 2000 },
      { deviceId: 'all', action: 'ct', params: { colorTemp: 6000 } }
    ],
    conditions: { minDevices: 1 },
    usageCount: 0,
    satisfactionScore: 73
  },
  {
    id: 'relax',
    name: '放松模式',
    description: '舒缓压力，放松身心',
    type: 'relax',
    priority: 'low',
    icon: 'Coffee',
    color: '#9575CD',
    trigger: {
      conditions: [
        { type: 'time_range', startTime: '18:00', endTime: '22:00' }
      ],
      logicalOperator: 'and'
    },
    actions: [
      { deviceId: 'all', action: 'brightness', params: { brightness: 40 }, transitionMs: 5000 },
      { deviceId: 'all', action: 'ct', params: { colorTemp: 3000 }, transitionMs: 5000 }
    ],
    conditions: { minDevices: 1 },
    usageCount: 0,
    satisfactionScore: 77
  }
]

class SceneRecommender extends EventEmitter {
  constructor(options = {}) {
    super()

    this.scenes = new Map()
    this.sceneTemplates = [...DEFAULT_SCENE_TEMPLATES]
    this.usageHistory = []
    this.userPreferences = {
      preferredScenes: [],
      dislikedScenes: [],
      autoApplyEnabled: false,
      notificationEnabled: true,
      energySavingPriority: 'medium',
      comfortPriority: 'medium'
    }

    // 加载已保存的场景
    this.loadSavedScenes()

    console.log(`SceneRecommender: 初始化完成，已加载 ${this.scenes.size} 个场景`)
  }

  /**
   * 加载保存的场景
   */
  loadSavedScenes() {
    // 从默认模板初始化
    for (const template of this.sceneTemplates) {
      if (!this.scenes.has(template.id)) {
        this.scenes.set(template.id, this.createSceneFromTemplate(template))
      }
    }
  }

  /**
   * 从模板创建场景
   */
  createSceneFromTemplate(template) {
    const now = new Date().toISOString()
    return {
      ...template,
      createdAt: now,
      updatedAt: now,
      id: template.id,
      usageCount: 0,
      satisfactionScore: template.satisfactionScore || 75
    }
  }

  /**
   * 生成推荐
   * @param {Array} devices - 设备列表
   * @param {Object} options - 选项
   * @returns {Array} 推荐列表
   */
  generateRecommendations(devices, options = {}) {
    const context = analyzeCurrentContext(devices, options)
    const recognizedActivity = recognizeCurrentActivity(context, devices)

    // 获取所有场景
    const allScenes = Array.from(this.scenes.values())

    // 计算每个场景的匹配度
    const scoredScenes = allScenes.map(scene => ({
      scene,
      score: calculateSceneMatchScore(scene, context, devices),
      reason: generateRecommendationReason(scene, context)
    }))

    // 过滤低匹配度的场景
    let filteredScenes = scoredScenes.filter(s => s.score >= 30)

    // 如果识别到活动，优先推荐相关场景
    if (recognizedActivity) {
      const activityScenes = filteredScenes.filter(s => s.scene.type === recognizedActivity)
      if (activityScenes.length > 0) {
        // 提升相关场景的分数
        filteredScenes = filteredScenes.map(s => {
          if (s.scene.type === recognizedActivity) {
            return { ...s, score: Math.min(100, s.score + 30) }
          }
          return s
        })
      }
    }

    // 根据用户偏好过滤
    filteredScenes = filteredScenes.filter(s => {
      if (this.userPreferences.dislikedScenes.includes(s.scene.id)) {
        return false
      }
      if (this.userPreferences.preferredScenes.includes(s.scene.id)) {
        return true
      }
      return true
    })

    // 排序：优先级高的优先，分数高的优先
    filteredScenes.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      const priorityDiff = priorityOrder[a.scene.priority] - priorityOrder[b.scene.priority]
      if (priorityDiff !== 0) return priorityDiff
      return b.score - a.score
    })

    // 限制数量
    const maxRecommendations = options.maxRecommendations || 5
    const topScenes = filteredScenes.slice(0, maxRecommendations)

    // 触发事件
    this.emit('recommendationsGenerated', {
      recommendations: topScenes,
      context,
      recognizedActivity
    })

    return {
      recommendations: topScenes.map(item => ({
        scene: item.scene,
        score: item.score,
        reason: item.reason
      })),
      context,
      recognizedActivity,
      generatedAt: new Date().toISOString()
    }
  }

  /**
   * 应用场景
   */
  async applyScene(sceneId, deviceManager, sceneManager) {
    const scene = this.scenes.get(sceneId)
    if (!scene) {
      console.warn(`SceneRecommender: 场景不存在: ${sceneId}`)
      return { success: false, error: '场景不存在' }
    }

    const results = []
    for (const action of scene.actions) {
      try {
        let result = false

        if (action.deviceId === 'all') {
          // 对所有设备执行
          const devices = deviceManager.getDevices()
          for (const device of devices) {
            result = await this.executeAction(device.id, action, deviceManager)
            results.push({ deviceId: device.id, success: result })
          }
        } else {
          result = await this.executeAction(action.deviceId, action, deviceManager)
          results.push({ deviceId: action.deviceId, success: result })
        }
      } catch (error) {
        console.error(`SceneRecommender: 执行动作失败:`, error)
        results.push({ deviceId: action.deviceId, success: false, error: error.message })
      }
    }

    // 更新使用统计
    scene.usageCount++
    scene.updatedAt = new Date().toISOString()

    // 记录到历史
    this.usageHistory.push({
      sceneId,
      timestamp: new Date().toISOString(),
      results
    })

    // 触发事件
    this.emit('sceneApplied', { sceneId, results })

    const allSuccess = results.every(r => r.success)
    return { success: allSuccess, results }
  }

  /**
   * 执行动作
   */
  async executeAction(deviceId, action, deviceManager) {
    switch (action.action) {
      case 'on':
        return deviceManager.togglePower(deviceId, true)
      case 'off':
        return deviceManager.togglePower(deviceId, false)
      case 'toggle':
        return deviceManager.toggle(deviceId)
      case 'brightness':
        return deviceManager.setBrightness(deviceId, action.params?.brightness || 50)
      case 'ct':
        return deviceManager.setColorTemperature(deviceId, action.params?.colorTemp || 4000)
      case 'color':
        return deviceManager.setColor(deviceId, action.params?.rgb || 0xFFFFFF)
      default:
        console.warn(`SceneRecommender: 未知的动作类型: ${action.action}`)
        return false
    }
  }

  /**
   * 记录用户反馈
   */
  recordFeedback(sceneId, feedback) {
    const scene = this.scenes.get(sceneId)
    if (!scene) return

    // 更新满意度评分
    if (feedback.rating !== undefined) {
      const weight = scene.usageCount
      scene.satisfactionScore = Math.round(
        (scene.satisfactionScore * weight + feedback.rating * 20) / (weight + 1)
      )
    }

    // 更新偏好
    if (feedback.preferred) {
      if (!this.userPreferences.preferredScenes.includes(sceneId)) {
        this.userPreferences.preferredScenes.push(sceneId)
      }
      this.userPreferences.dislikedScenes = this.userPreferences.dislikedScenes.filter(id => id !== sceneId)
    } else if (feedback.disliked) {
      if (!this.userPreferences.dislikedScenes.includes(sceneId)) {
        this.userPreferences.dislikedScenes.push(sceneId)
      }
      this.userPreferences.preferredScenes = this.userPreferences.preferredScenes.filter(id => id !== sceneId)
    }

    scene.updatedAt = new Date().toISOString()

    this.emit('feedbackRecorded', { sceneId, feedback, scene })
  }

  /**
   * 获取所有场景
   */
  getAllScenes() {
    return Array.from(this.scenes.values())
  }

  /**
   * 获取场景
   */
  getScene(sceneId) {
    return this.scenes.get(sceneId) || null
  }

  /**
   * 更新场景
   */
  updateScene(sceneId, updates) {
    const scene = this.scenes.get(sceneId)
    if (!scene) return null

    const updatedScene = {
      ...scene,
      ...updates,
      id: scene.id, // 保持ID不变
      updatedAt: new Date().toISOString()
    }

    this.scenes.set(sceneId, updatedScene)
    this.emit('sceneUpdated', updatedScene)

    return updatedScene
  }

  /**
   * 创建自定义场景
   */
  createCustomScene(sceneData) {
    const id = `custom_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`
    const now = new Date().toISOString()

    const scene = {
      ...sceneData,
      id,
      type: 'custom',
      priority: sceneData.priority || 'medium',
      usageCount: 0,
      satisfactionScore: 75,
      createdAt: now,
      updatedAt: now
    }

    this.scenes.set(id, scene)
    this.emit('sceneCreated', scene)

    return scene
  }

  /**
   * 删除场景
   */
  deleteScene(sceneId) {
    // 不允许删除默认场景
    const scene = this.scenes.get(sceneId)
    if (scene && scene.type !== 'custom') {
      console.warn(`SceneRecommender: 不能删除默认场景: ${sceneId}`)
      return false
    }

    const deleted = this.scenes.delete(sceneId)
    if (deleted) {
      this.emit('sceneDeleted', sceneId)
    }
    return deleted
  }

  /**
   * 获取使用统计
   */
  getUsageStats() {
    const scenes = Array.from(this.scenes.values())
    const totalUsage = scenes.reduce((sum, s) => sum + s.usageCount, 0)

    return {
      totalScenes: scenes.length,
      totalUsage,
      topScenes: scenes
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 5)
        .map(s => ({ id: s.id, name: s.name, usageCount: s.usageCount })),
      byType: scenes.reduce((acc, s) => {
        acc[s.type] = (acc[s.type] || 0) + 1
        return acc
      }, {}),
      avgSatisfaction: Math.round(
        scenes.reduce((sum, s) => sum + s.satisfactionScore, 0) / scenes.length
      )
    }
  }

  /**
   * 设置用户偏好
   */
  setUserPreferences(prefs) {
    this.userPreferences = {
      ...this.userPreferences,
      ...prefs
    }
    this.emit('preferencesUpdated', this.userPreferences)
  }

  /**
   * 获取用户偏好
   */
  getUserPreferences() {
    return { ...this.userPreferences }
  }

  /**
   * 清理资源
   */
  cleanup() {
    this.scenes.clear()
    this.usageHistory = []
    console.log('SceneRecommender: 资源已清理')
  }
}

module.exports = SceneRecommender
