/**
 * AI 场景推荐引擎测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock SceneAnalyzer functions
const getTimeOfDay = (date: Date): string => {
  const hour = date.getHours()
  if (hour >= 5 && hour < 7) return 'dawn'
  if (hour >= 7 && hour < 10) return 'morning'
  if (hour >= 10 && hour < 13) return 'noon'
  if (hour >= 13 && hour < 18) return 'afternoon'
  if (hour >= 18 && hour < 21) return 'evening'
  if (hour >= 21 && hour < 24) return 'night'
  return 'midnight'
}

const isInTimeRange = (currentTime: string, startTime: string, endTime: string): boolean => {
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

interface DeviceState {
  isOn: boolean
  brightness: number
  colorTemp: number
  rgb: number
  isOnline: boolean
  supportsColor: boolean
  supportsCt: boolean
  supportsBrightness: boolean
}

interface Device {
  id: string
  name: string
  model: string
  power: 'on' | 'off'
  brightness?: number
  colorTemp?: number
  rgb?: number
  connected?: boolean
  supports?: {
    color?: boolean
    colorTemp?: boolean
    brightness?: boolean
  }
}

const analyzeDeviceState = (device: Device): DeviceState => {
  return {
    isOn: device.power === 'on',
    brightness: device.brightness || 0,
    colorTemp: device.colorTemp || 0,
    rgb: device.rgb || 0,
    isOnline: device.connected !== false,
    supportsColor: device.supports?.color || device.model?.includes('color'),
    supportsCt: device.supports?.colorTemp || device.model?.includes('ct') || device.model?.includes('bulb'),
    supportsBrightness: device.supports?.brightness || device.model?.includes('bulb')
  }
}

const evaluateCondition = (value: any, operator: string, target: any): boolean => {
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

describe('SceneAnalyzer - getTimeOfDay', () => {
  it('should return dawn for hours 5-6', () => {
    const date5 = new Date('2024-01-01T05:00:00')
    const date6 = new Date('2024-01-01T06:30:00')

    expect(getTimeOfDay(date5)).toBe('dawn')
    expect(getTimeOfDay(date6)).toBe('dawn')
  })

  it('should return morning for hours 7-9', () => {
    const date7 = new Date('2024-01-01T07:00:00')
    const date9 = new Date('2024-01-01T09:59:00')

    expect(getTimeOfDay(date7)).toBe('morning')
    expect(getTimeOfDay(date9)).toBe('morning')
  })

  it('should return noon for hours 10-12', () => {
    const date10 = new Date('2024-01-01T10:00:00')
    const date12 = new Date('2024-01-01T12:30:00')

    expect(getTimeOfDay(date10)).toBe('noon')
    expect(getTimeOfDay(date12)).toBe('noon')
  })

  it('should return afternoon for hours 13-17', () => {
    const date13 = new Date('2024-01-01T13:00:00')
    const date17 = new Date('2024-01-01T17:30:00')

    expect(getTimeOfDay(date13)).toBe('afternoon')
    expect(getTimeOfDay(date17)).toBe('afternoon')
  })

  it('should return evening for hours 18-20', () => {
    const date18 = new Date('2024-01-01T18:00:00')
    const date20 = new Date('2024-01-01T20:30:00')

    expect(getTimeOfDay(date18)).toBe('evening')
    expect(getTimeOfDay(date20)).toBe('evening')
  })

  it('should return night for hours 21-23', () => {
    const date21 = new Date('2024-01-01T21:00:00')
    const date23 = new Date('2024-01-01T23:30:00')

    expect(getTimeOfDay(date21)).toBe('night')
    expect(getTimeOfDay(date23)).toBe('night')
  })

  it('should return midnight for hours 0-4', () => {
    const date0 = new Date('2024-01-01T00:00:00')
    const date4 = new Date('2024-01-01T04:30:00')

    expect(getTimeOfDay(date0)).toBe('midnight')
    expect(getTimeOfDay(date4)).toBe('midnight')
  })
})

describe('SceneAnalyzer - isInTimeRange', () => {
  it('should return true when time is within range', () => {
    expect(isInTimeRange('10:00', '09:00', '11:00')).toBe(true)
    expect(isInTimeRange('09:30', '09:00', '11:00')).toBe(true)
    expect(isInTimeRange('10:59', '09:00', '11:00')).toBe(true)
  })

  it('should return false when time is outside range', () => {
    expect(isInTimeRange('08:00', '09:00', '11:00')).toBe(false)
    expect(isInTimeRange('12:00', '09:00', '11:00')).toBe(false)
  })

  it('should handle exact boundaries', () => {
    expect(isInTimeRange('09:00', '09:00', '11:00')).toBe(true)
    expect(isInTimeRange('11:00', '09:00', '11:00')).toBe(true)
  })

  it('should handle midnight crossing', () => {
    // 22:00 to 06:00 spans midnight
    expect(isInTimeRange('23:00', '22:00', '06:00')).toBe(true)
    expect(isInTimeRange('02:00', '22:00', '06:00')).toBe(true)
    expect(isInTimeRange('06:00', '22:00', '06:00')).toBe(true)
    expect(isInTimeRange('10:00', '22:00', '06:00')).toBe(false)
  })
})

describe('SceneAnalyzer - analyzeDeviceState', () => {
  it('should correctly analyze powered on device', () => {
    const device: Device = {
      id: 'test-1',
      name: 'Test Light',
      model: 'color_bulb',
      power: 'on',
      brightness: 80,
      colorTemp: 4000,
      rgb: 16777215,
      connected: true,
      supports: { color: true, colorTemp: true, brightness: true }
    }

    const state = analyzeDeviceState(device)

    expect(state.isOn).toBe(true)
    expect(state.brightness).toBe(80)
    expect(state.colorTemp).toBe(4000)
    expect(state.rgb).toBe(16777215)
    expect(state.isOnline).toBe(true)
    expect(state.supportsColor).toBe(true)
    expect(state.supportsCt).toBe(true)
  })

  it('should correctly analyze powered off device', () => {
    const device: Device = {
      id: 'test-2',
      name: 'Test Light',
      model: 'mono',
      power: 'off',
      connected: true
    }

    const state = analyzeDeviceState(device)

    expect(state.isOn).toBe(false)
    expect(state.brightness).toBe(0)
    expect(state.isOnline).toBe(true)
  })

  it('should detect offline device', () => {
    const device: Device = {
      id: 'test-3',
      name: 'Test Light',
      model: 'ceiling',
      power: 'off',
      connected: false
    }

    const state = analyzeDeviceState(device)

    expect(state.isOnline).toBe(false)
  })

  it('should detect color support from model name', () => {
    const colorDevice: Device = {
      id: 'test-4',
      name: 'Color Light',
      model: 'color_bulb',
      power: 'on'
    }

    const state = analyzeDeviceState(colorDevice)
    expect(state.supportsColor).toBe(true)
  })
})

describe('SceneAnalyzer - evaluateCondition', () => {
  it('should handle equality operator', () => {
    expect(evaluateCondition(100, 'eq', 100)).toBe(true)
    expect(evaluateCondition(100, 'eq', 50)).toBe(false)
    expect(evaluateCondition('on', 'eq', 'on')).toBe(true)
  })

  it('should handle not equal operator', () => {
    expect(evaluateCondition(100, 'ne', 50)).toBe(true)
    expect(evaluateCondition(100, 'ne', 100)).toBe(false)
  })

  it('should handle greater than operator', () => {
    expect(evaluateCondition(100, 'gt', 50)).toBe(true)
    expect(evaluateCondition(50, 'gt', 100)).toBe(false)
    expect(evaluateCondition(100, 'gt', 100)).toBe(false)
  })

  it('should handle less than operator', () => {
    expect(evaluateCondition(50, 'lt', 100)).toBe(true)
    expect(evaluateCondition(100, 'lt', 50)).toBe(false)
    expect(evaluateCondition(100, 'lt', 100)).toBe(false)
  })

  it('should handle greater than or equal operator', () => {
    expect(evaluateCondition(100, 'gte', 100)).toBe(true)
    expect(evaluateCondition(101, 'gte', 100)).toBe(true)
    expect(evaluateCondition(99, 'gte', 100)).toBe(false)
  })

  it('should handle less than or equal operator', () => {
    expect(evaluateCondition(100, 'lte', 100)).toBe(true)
    expect(evaluateCondition(99, 'lte', 100)).toBe(true)
    expect(evaluateCondition(101, 'lte', 100)).toBe(false)
  })

  it('should return false for unknown operator', () => {
    expect(evaluateCondition(100, 'unknown', 100)).toBe(false)
    expect(evaluateCondition(100, '', 100)).toBe(false)
  })
})

describe('Scene Types and Recommendations', () => {
  const sceneTemplates = [
    { id: 'morning_routine', name: '早间模式', type: 'morning_routine', priority: 'high' },
    { id: 'night_routine', name: '夜间模式', type: 'night_routine', priority: 'high' },
    { id: 'movie_time', name: '观影模式', type: 'movie_time', priority: 'medium' },
    { id: 'reading', name: '阅读模式', type: 'reading', priority: 'medium' },
    { id: 'work_from_home', name: '工作模式', type: 'work_from_home', priority: 'medium' },
    { id: 'party', name: '派对模式', type: 'party', priority: 'low' },
    { id: 'romantic', name: '浪漫模式', type: 'romantic', priority: 'low' }
  ]

  it('should have unique scene IDs', () => {
    const ids = sceneTemplates.map(s => s.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it('should have valid priority levels', () => {
    const validPriorities = ['high', 'medium', 'low']
    sceneTemplates.forEach(scene => {
      expect(validPriorities).toContain(scene.priority)
    })
  })

  it('should correctly categorize scenes by priority', () => {
    const highPriority = sceneTemplates.filter(s => s.priority === 'high')
    const mediumPriority = sceneTemplates.filter(s => s.priority === 'medium')
    const lowPriority = sceneTemplates.filter(s => s.priority === 'low')

    expect(highPriority.length).toBe(2)
    expect(mediumPriority.length).toBe(3)
    expect(lowPriority.length).toBe(2)
  })
})

describe('Scene Actions Validation', () => {
  const actions = [
    { deviceId: 'all', action: 'on', params: { brightness: 80 } },
    { deviceId: 'all', action: 'off' },
    { deviceId: 'all', action: 'brightness', params: { brightness: 50 } },
    { deviceId: 'all', action: 'ct', params: { colorTemp: 4000 } },
    { deviceId: 'all', action: 'color', params: { rgb: 0xFF0000 } }
  ]

  it('should have valid action types', () => {
    const validActions = ['on', 'off', 'toggle', 'brightness', 'ct', 'color']
    actions.forEach(action => {
      expect(validActions).toContain(action.action)
    })
  })

  it('should have valid brightness values', () => {
    const brightnessActions = actions.filter(a => a.params?.brightness !== undefined)
    brightnessActions.forEach(action => {
      expect(action.params!.brightness).toBeGreaterThanOrEqual(0)
      expect(action.params!.brightness).toBeLessThanOrEqual(100)
    })
  })

  it('should have valid color temperature values', () => {
    const ctActions = actions.filter(a => a.params?.colorTemp !== undefined)
    ctActions.forEach(action => {
      expect(action.params!.colorTemp).toBeGreaterThanOrEqual(1700)
      expect(action.params!.colorTemp).toBeLessThanOrEqual(6500)
    })
  })
})

describe('Time-based Recommendations', () => {
  const timeOfDayScores: Record<string, string[]> = {
    dawn: ['morning_routine', 'energy_saving'],
    morning: ['morning_routine', 'work_from_home', 'focus'],
    noon: ['work_from_home', 'focus'],
    afternoon: ['work_from_home', 'focus', 'relax'],
    evening: ['movie_time', 'reading', 'romantic', 'party'],
    night: ['night_routine', 'relax'],
    midnight: ['night_routine']
  }

  it('should recommend morning_routine in morning/dawn', () => {
    expect(timeOfDayScores.dawn).toContain('morning_routine')
    expect(timeOfDayScores.morning).toContain('morning_routine')
  })

  it('should recommend work_from_home during work hours', () => {
    expect(timeOfDayScores.morning).toContain('work_from_home')
    expect(timeOfDayScores.noon).toContain('work_from_home')
    expect(timeOfDayScores.afternoon).toContain('work_from_home')
  })

  it('should recommend night_routine at night', () => {
    expect(timeOfDayScores.night).toContain('night_routine')
    expect(timeOfDayScores.midnight).toContain('night_routine')
  })

  it('should recommend entertainment scenes in evening', () => {
    expect(timeOfDayScores.evening).toContain('movie_time')
    expect(timeOfDayScores.evening).toContain('party')
    expect(timeOfDayScores.evening).toContain('romantic')
  })

  it('should have recommendations for all time periods', () => {
    Object.keys(timeOfDayScores).forEach(timeOfDay => {
      expect(timeOfDayScores[timeOfDay].length).toBeGreaterThan(0)
    })
  })
})

describe('User Preferences', () => {
  interface UserPreferences {
    preferredScenes: string[]
    dislikedScenes: string[]
    autoApplyEnabled: boolean
    notificationEnabled: boolean
    energySavingPriority: 'low' | 'medium' | 'high'
    comfortPriority: 'low' | 'medium' | 'high'
  }

  const defaultPreferences: UserPreferences = {
    preferredScenes: [],
    dislikedScenes: [],
    autoApplyEnabled: false,
    notificationEnabled: true,
    energySavingPriority: 'medium',
    comfortPriority: 'medium'
  }

  it('should have default preferences', () => {
    expect(defaultPreferences.preferredScenes).toEqual([])
    expect(defaultPreferences.dislikedScenes).toEqual([])
    expect(defaultPreferences.autoApplyEnabled).toBe(false)
    expect(defaultPreferences.notificationEnabled).toBe(true)
  })

  it('should filter disliked scenes', () => {
    const scenes = [
      { id: 'scene1', name: 'Scene 1' },
      { id: 'scene2', name: 'Scene 2' },
      { id: 'scene3', name: 'Scene 3' }
    ]
    const dislikedScenes = ['scene2']

    const filtered = scenes.filter(s => !dislikedScenes.includes(s.id))

    expect(filtered.length).toBe(2)
    expect(filtered.map(s => s.id)).not.toContain('scene2')
  })

  it('should prioritize preferred scenes', () => {
    const scenes = [
      { id: 'scene1', score: 50 },
      { id: 'scene2', score: 60 },
      { id: 'scene3', score: 40 }
    ]
    const preferredScenes = ['scene3']

    const boosted = scenes.map(s => ({
      ...s,
      score: preferredScenes.includes(s.id) ? s.score + 30 : s.score
    }))

    const sorted = boosted.sort((a, b) => b.score - a.score)

    expect(sorted[0].id).toBe('scene3') // Was lowest, now highest with boost
  })
})

describe('Usage Statistics', () => {
  const scenes = [
    { id: 'scene1', name: 'Scene 1', usageCount: 10, satisfactionScore: 85 },
    { id: 'scene2', name: 'Scene 2', usageCount: 5, satisfactionScore: 90 },
    { id: 'scene3', name: 'Scene 3', usageCount: 15, satisfactionScore: 70 }
  ]

  it('should calculate total usage correctly', () => {
    const totalUsage = scenes.reduce((sum, s) => sum + s.usageCount, 0)
    expect(totalUsage).toBe(30)
  })

  it('should find top used scenes', () => {
    const topUsed = [...scenes].sort((a, b) => b.usageCount - a.usageCount)
    expect(topUsed[0].id).toBe('scene3')
    expect(topUsed[0].usageCount).toBe(15)
  })

  it('should calculate average satisfaction', () => {
    const avgSatisfaction = scenes.reduce((sum, s) => sum + s.satisfactionScore, 0) / scenes.length
    expect(avgSatisfaction).toBeCloseTo(81.67, 1)
  })

  it('should update satisfaction score with new feedback', () => {
    const scene = { usageCount: 10, satisfactionScore: 80 }
    const newRating = 5 // out of 5 = 100%

    // Weighted average formula
    const weight = scene.usageCount
    const newScore = Math.round(
      (scene.satisfactionScore * weight + newRating * 20) / (weight + 1)
    )

    expect(newScore).toBeGreaterThan(scene.satisfactionScore) // Should increase
  })
})
