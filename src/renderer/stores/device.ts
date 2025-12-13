/**
 * Device Store - 设备状态管理
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Device, DeviceSource, DeviceFilter } from '@/renderer/types/device'
import ipcService from '@/renderer/services/ipc.service'
import { ElMessage } from 'element-plus'

export const useDeviceStore = defineStore('device', () => {
  // ==================== State ====================

  // 设备列表
  const devices = ref<Device[]>([])
  // 当前选中的设备
  const selectedDevice = ref<Device | null>(null)
  // 当前设备来源
  const deviceSource = ref<DeviceSource>('local')
  // 是否正在发现/同步设备
  const isDiscovering = ref(false)
  // 最后同步时间
  const lastSyncTime = ref<Date | null>(null)
  // 设备过滤器
  const filter = ref<DeviceFilter>({})

  // ==================== Getters ====================

  // 按来源过滤的设备
  const filteredDevices = computed(() => {
    let result = devices.value

    // 关键字搜索
    if (filter.value.keyword) {
      const keyword = filter.value.keyword.toLowerCase()
      result = result.filter(d =>
        d.name.toLowerCase().includes(keyword) ||
        d.model.toLowerCase().includes(keyword) ||
        d.id.toLowerCase().includes(keyword)
      )
    }

    // 按电源状态过滤
    if (filter.value.power) {
      result = result.filter(d => d.power === filter.value.power)
    }

    // 按类型过滤
    if (filter.value.type) {
      result = result.filter(d => d.model === filter.value.type)
    }

    return result
  })

  // 在线设备数
  const onlineDeviceCount = computed(() =>
    devices.value.filter(d => d.connected).length
  )

  // 开启的设备数
  const powerOnDeviceCount = computed(() =>
    devices.value.filter(d => d.power === 'on').length
  )

  // 总设备数
  const totalDeviceCount = computed(() => devices.value.length)

  // ==================== Actions ====================

  // 发现/同步设备
  async function discoverDevices(): Promise<void> {
    if (isDiscovering.value) return

    isDiscovering.value = true
    try {
      if (deviceSource.value === 'local') {
        // 本地发现
        await ipcService.discoverDevices()
        // 等待发现完成事件，先获取已有设备
        const localDevices = await ipcService.getDevices()
        devices.value = localDevices.map(d => ({
          ...d,
          source: 'local' as DeviceSource,
          connected: true
        }))
      } else {
        // 云端同步
        const cloudDevices = await ipcService.cloudSyncDevices()
        devices.value = cloudDevices.map(d => ({
          ...d,
          source: 'cloud' as DeviceSource
        }))
      }
      lastSyncTime.value = new Date()
      ElMessage.success(`发现 ${devices.value.length} 个设备`)
    } catch (error) {
      console.error('设备发现失败:', error)
      ElMessage.error('设备发现失败，请重试')
    } finally {
      isDiscovering.value = false
    }
  }

  // 刷新设备列表
  async function refreshDevices(): Promise<void> {
    return discoverDevices()
  }

  // 切换设备来源
  async function setDeviceSource(source: DeviceSource): Promise<void> {
    if (source === deviceSource.value) return

    deviceSource.value = source
    devices.value = []
    selectedDevice.value = null
    await discoverDevices()
  }

  // 选中设备
  function selectDevice(device: Device | null): void {
    selectedDevice.value = device
  }

  // 根据ID获取设备
  function getDeviceById(id: string): Device | undefined {
    return devices.value.find(d => d.id === id)
  }

  // 更新单个设备状态
  function updateDevice(deviceId: string, updates: Partial<Device>): void {
    const index = devices.value.findIndex(d => d.id === deviceId)
    if (index !== -1) {
      devices.value[index] = { ...devices.value[index], ...updates }
      // 如果是当前选中的设备也更新
      if (selectedDevice.value?.id === deviceId) {
        selectedDevice.value = { ...selectedDevice.value, ...updates }
      }
    }
  }

  // 设置过滤器
  function setFilter(newFilter: DeviceFilter): void {
    filter.value = newFilter
  }

  // 清除过滤器
  function clearFilter(): void {
    filter.value = {}
  }

  // ==================== 设备控制方法 ====================

  // 切换电源
  async function togglePower(deviceId: string, power: boolean): Promise<boolean> {
    try {
      let success: boolean
      if (deviceSource.value === 'local') {
        success = await ipcService.togglePower(deviceId, power)
      } else {
        success = await ipcService.cloudTogglePower(deviceId, power)
      }

      if (success) {
        // 乐观更新
        updateDevice(deviceId, { power: power ? 'on' : 'off' })
      }
      return success
    } catch (error) {
      console.error('电源控制失败:', error)
      ElMessage.error('电源控制失败')
      return false
    }
  }

  // 设置亮度
  async function setBrightness(deviceId: string, brightness: number): Promise<boolean> {
    try {
      let success: boolean
      if (deviceSource.value === 'local') {
        success = await ipcService.setBrightness(deviceId, brightness)
      } else {
        success = await ipcService.cloudSetBrightness(deviceId, brightness)
      }

      if (success) {
        updateDevice(deviceId, { bright: brightness })
      }
      return success
    } catch (error) {
      console.error('亮度设置失败:', error)
      ElMessage.error('亮度设置失败')
      return false
    }
  }

  // 设置色温
  async function setColorTemperature(deviceId: string, ct: number): Promise<boolean> {
    try {
      let success: boolean
      if (deviceSource.value === 'local') {
        success = await ipcService.setColorTemperature(deviceId, ct)
      } else {
        success = await ipcService.cloudSetColorTemperature(deviceId, ct)
      }

      if (success) {
        updateDevice(deviceId, { ct, color_mode: 2 })
      }
      return success
    } catch (error) {
      console.error('色温设置失败:', error)
      ElMessage.error('色温设置失败')
      return false
    }
  }

  // 设置颜色
  async function setColor(deviceId: string, rgb: number): Promise<boolean> {
    try {
      let success: boolean
      if (deviceSource.value === 'local') {
        success = await ipcService.setColor(deviceId, rgb)
      } else {
        success = await ipcService.cloudSetColor(deviceId, rgb)
      }

      if (success) {
        updateDevice(deviceId, { rgb, color_mode: 1 })
      }
      return success
    } catch (error) {
      console.error('颜色设置失败:', error)
      ElMessage.error('颜色设置失败')
      return false
    }
  }

  // ==================== 事件监听 ====================

  // 设置 IPC 事件监听器
  function setupEventListeners(): void {
    // 设备添加
    ipcService.on('deviceAdded', (device: Device) => {
      const existing = devices.value.find(d => d.id === device.id)
      if (!existing) {
        devices.value.push({
          ...device,
          source: deviceSource.value,
          connected: true
        })
      }
    })

    // 设备更新
    ipcService.on('deviceUpdated', (device: Device) => {
      updateDevice(device.id, device)
    })

    // 发现完成
    ipcService.on('discoverDone', () => {
      isDiscovering.value = false
      lastSyncTime.value = new Date()
    })

    // 云设备同步完成
    ipcService.on('cloudDevicesSynced', (cloudDevices: Device[]) => {
      if (deviceSource.value === 'cloud') {
        devices.value = cloudDevices.map(d => ({
          ...d,
          source: 'cloud' as DeviceSource
        }))
      }
    })

    // 云设备更新
    ipcService.on('cloudDeviceUpdated', (device: Device) => {
      if (deviceSource.value === 'cloud') {
        updateDevice(device.id, device)
      }
    })
  }

  // 清理事件监听器
  function cleanupEventListeners(): void {
    ipcService.off('deviceAdded')
    ipcService.off('deviceUpdated')
    ipcService.off('discoverDone')
    ipcService.off('cloudDevicesSynced')
    ipcService.off('cloudDeviceUpdated')
  }

  return {
    // State
    devices,
    selectedDevice,
    deviceSource,
    isDiscovering,
    lastSyncTime,
    filter,
    // Getters
    filteredDevices,
    onlineDeviceCount,
    powerOnDeviceCount,
    totalDeviceCount,
    // Actions
    discoverDevices,
    refreshDevices,
    setDeviceSource,
    selectDevice,
    getDeviceById,
    updateDevice,
    setFilter,
    clearFilter,
    // 设备控制
    togglePower,
    setBrightness,
    setColorTemperature,
    setColor,
    // 事件监听
    setupEventListeners,
    cleanupEventListeners
  }
})
