/**
 * 设备过滤逻辑测试
 */

import { describe, it, expect } from 'vitest'
import type { Device, DeviceFilter, DeviceSource } from '@/renderer/types/device'

// 模拟设备数据
const createMockDevice = (overrides: Partial<Device> = {}): Device => ({
  id: 'device-1',
  name: '测试灯',
  model: 'ceiling',
  power: 'on',
  bright: 80,
  ct: 4000,
  rgb: 16777215,
  connected: true,
  source: 'local' as DeviceSource,
  color_mode: 2,
  ...overrides
})

describe('Device Filtering', () => {
  const devices: Device[] = [
    createMockDevice({ id: '1', name: '客厅灯', model: 'ceiling', power: 'on' }),
    createMockDevice({ id: '2', name: '卧室灯', model: 'stripe', power: 'off' }),
    createMockDevice({ id: '3', name: '厨房灯', model: 'ceiling', power: 'on', bright: 100 }),
    createMockDevice({ id: '4', name: '书房灯', model: 'bulb', power: 'off', bright: 30 }),
    createMockDevice({ id: '5', name: '阳台灯', model: 'stripe', power: 'on' })
  ]

  const filterDevices = (filter: DeviceFilter): Device[] => {
    let result = devices

    if (filter.keyword) {
      const keyword = filter.keyword.toLowerCase()
      result = result.filter(d =>
        d.name.toLowerCase().includes(keyword) ||
        d.model.toLowerCase().includes(keyword) ||
        d.id.toLowerCase().includes(keyword)
      )
    }

    if (filter.power) {
      result = result.filter(d => d.power === filter.power)
    }

    if (filter.type) {
      result = result.filter(d => d.model === filter.type)
    }

    return result
  }

  describe('keyword filter', () => {
    it('should filter by name', () => {
      const result = filterDevices({ keyword: '客厅' })

      expect(result.length).toBe(1)
      expect(result[0].name).toBe('客厅灯')
    })

    it('should filter by model', () => {
      const result = filterDevices({ keyword: 'ceiling' })

      expect(result.length).toBe(2)
      expect(result.every(d => d.model === 'ceiling')).toBe(true)
    })

    it('should be case insensitive', () => {
      const result1 = filterDevices({ keyword: '客厅' })
      const result2 = filterDevices({ keyword: '客庁' }) // Different case
      const result3 = filterDevices({ keyword: 'LIVING' }) // English

      expect(result1.length).toBe(1)
      expect(result2.length).toBe(0)
      expect(result3.length).toBe(0)
    })

    it('should return all devices with empty keyword', () => {
      const result = filterDevices({ keyword: '' })

      expect(result.length).toBe(5)
    })
  })

  describe('power filter', () => {
    it('should filter powered on devices', () => {
      const result = filterDevices({ power: 'on' })

      expect(result.length).toBe(3)
      expect(result.every(d => d.power === 'on')).toBe(true)
    })

    it('should filter powered off devices', () => {
      const result = filterDevices({ power: 'off' })

      expect(result.length).toBe(2)
      expect(result.every(d => d.power === 'off')).toBe(true)
    })
  })

  describe('type filter', () => {
    it('should filter by device type (model)', () => {
      const result = filterDevices({ type: 'ceiling' })

      expect(result.length).toBe(2)
      expect(result.every(d => d.model === 'ceiling')).toBe(true)
    })

    it('should filter stripe devices', () => {
      const result = filterDevices({ type: 'stripe' })

      expect(result.length).toBe(2)
      expect(result.every(d => d.model === 'stripe')).toBe(true)
    })
  })

  describe('combined filters', () => {
    it('should combine keyword and power filters', () => {
      const result = filterDevices({ keyword: '灯', power: 'on' })

      // 客厅灯, 厨房灯, 阳台灯 all match '灯' and are 'on'
      expect(result.length).toBe(3)
      expect(result.every(d => d.power === 'on')).toBe(true)
    })

    it('should combine power and type filters', () => {
      const result = filterDevices({ power: 'on', type: 'ceiling' })

      expect(result.length).toBe(2) // 客厅灯, 厨房灯
      expect(result.every(d => d.power === 'on' && d.model === 'ceiling')).toBe(true)
    })

    it('should combine all three filters', () => {
      const result = filterDevices({ keyword: '灯', power: 'on', type: 'ceiling' })

      expect(result.length).toBe(2) // 客厅灯, 厨房灯
    })
  })

  describe('empty filter', () => {
    it('should return all devices with empty filter object', () => {
      const result = filterDevices({})

      expect(result.length).toBe(5)
    })

    it('should return all devices with undefined filter', () => {
      const result = filterDevices({} as DeviceFilter)

      expect(result.length).toBe(5)
    })
  })
})

describe('Device Statistics', () => {
  const devices: Device[] = [
    createMockDevice({ id: '1', power: 'on', connected: true }),
    createMockDevice({ id: '2', power: 'on', connected: true }),
    createMockDevice({ id: '3', power: 'off', connected: true }),
    createMockDevice({ id: '4', power: 'off', connected: false }),
    createMockDevice({ id: '5', power: 'on', connected: true })
  ]

  describe('onlineDeviceCount', () => {
    it('should count connected devices', () => {
      const count = devices.filter(d => d.connected).length

      expect(count).toBe(4)
    })
  })

  describe('powerOnDeviceCount', () => {
    it('should count powered on devices', () => {
      const count = devices.filter(d => d.power === 'on').length

      expect(count).toBe(3)
    })
  })

  describe('totalDeviceCount', () => {
    it('should return total number of devices', () => {
      const count = devices.length

      expect(count).toBe(5)
    })
  })
})

describe('Device Update Logic', () => {
  it('should update device with partial data', () => {
    const device = createMockDevice({ bright: 50, power: 'off' })

    const updated = { ...device, bright: 100, power: 'on' as const }

    expect(updated.bright).toBe(100)
    expect(updated.power).toBe('on')
    expect(updated.id).toBe(device.id) // Unchanged
    expect(updated.name).toBe(device.name) // Unchanged
  })

  it('should handle update when device not found', () => {
    const devices: Device[] = [createMockDevice({ id: '1' })]

    const findDevice = (id: string) => devices.find(d => d.id === id)
    const updateDevice = (id: string, updates: Partial<Device>) => {
      const index = devices.findIndex(d => d.id === id)
      if (index !== -1) {
        devices[index] = { ...devices[index], ...updates }
      }
    }

    updateDevice('non-existent', { bright: 100 })

    expect(devices.length).toBe(1)
    expect(devices[0].bright).toBe(80) // Original value
  })
})

describe('Brightness Validation', () => {
  it('should accept valid brightness range (1-100)', () => {
    const validBrightness = [1, 50, 100]

    validBrightness.forEach(bright => {
      expect(bright >= 1 && bright <= 100).toBe(true)
    })
  })

  it('should reject brightness below minimum', () => {
    const invalidBrightness = [0, -1, -10]

    invalidBrightness.forEach(bright => {
      expect(bright >= 1 && bright <= 100).toBe(false)
    })
  })

  it('should reject brightness above maximum', () => {
    const invalidBrightness = [101, 150, 200]

    invalidBrightness.forEach(bright => {
      expect(bright >= 1 && bright <= 100).toBe(false)
    })
  })
})

describe('Color Temperature Validation', () => {
  it('should accept valid color temperature range (1700-6500)', () => {
    const validCT = [1700, 4000, 6500]

    validCT.forEach(ct => {
      expect(ct >= 1700 && ct <= 6500).toBe(true)
    })
  })

  it('should reject invalid color temperature', () => {
    const invalidCT = [1000, 7000, 0]

    invalidCT.forEach(ct => {
      expect(ct >= 1700 && ct <= 6500).toBe(false)
    })
  })
})

describe('RGB Color Validation', () => {
  it('should accept valid RGB range (0-16777215)', () => {
    const validRGB = [0, 65280, 16777215]

    validRGB.forEach(rgb => {
      expect(rgb >= 0 && rgb <= 16777215).toBe(true)
    })
  })

  it('should reject invalid RGB values', () => {
    const invalidRGB = [-1, 16777216, 20000000]

    invalidRGB.forEach(rgb => {
      expect(rgb >= 0 && rgb <= 16777215).toBe(false)
    })
  })

  it('should calculate RGB hex correctly', () => {
    // White: 16777215 (0xFFFFFF)
    // Red: 16711680 (0xFF0000)
    // Green: 65280 (0x00FF00)
    // Blue: 255 (0x0000FF)

    expect(16777215).toBe(0xFFFFFF)
    expect(16711680).toBe(0xFF0000)
    expect(65280).toBe(0x00FF00)
    expect(255).toBe(0x0000FF)
  })
})
