/**
 * Timer Store - 定时任务状态管理
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Timer, TimerQuery, CreateTimerParams, UpdateTimerParams, TimerSummary } from '@/renderer/types/timer'
import ipcService from '@/renderer/services/ipc.service'
import { ElMessage } from 'element-plus'

export const useTimerStore = defineStore('timer', () => {
  // ==================== State ====================

  // 定时任务列表
  const timers = ref<Timer[]>([])
  // 当前选中的定时任务
  const selectedTimer = ref<Timer | null>(null)
  // 是否正在加载
  const isLoading = ref(false)
  // 最后同步时间
  const lastSyncTime = ref<Date | null>(null)

  // ==================== Getters ====================

  // 按状态分组的定时任务
  const timersByStatus = computed(() => {
    const grouped = {
      active: [] as Timer[],
      paused: [] as Timer[],
      expired: [] as Timer[],
      completed: [] as Timer[]
    }

    for (const timer of timers.value) {
      grouped[timer.status].push(timer)
    }

    return grouped
  })

  // 即将触发的定时任务 (最多5个)
  const upcomingTimers = computed(() => {
    return timers.value
      .filter(t => t.status === 'active' && t.nextTriggerAt)
      .sort((a, b) => {
        const aTime = new Date(a.nextTriggerAt!).getTime()
        const bTime = new Date(b.nextTriggerAt!).getTime()
        return aTime - bTime
      })
      .slice(0, 5)
  })

  // 统计信息
  const stats = computed(() => ({
    total: timers.value.length,
    active: timers.value.filter(t => t.status === 'active').length,
    paused: timers.value.filter(t => t.status === 'paused').length,
    expired: timers.value.filter(t => t.status === 'expired').length,
    completed: timers.value.filter(t => t.status === 'completed').length
  }))

  // ==================== Actions ====================

  // 加载定时任务列表
  async function loadTimers(): Promise<void> {
    isLoading.value = true
    try {
      // 从主进程获取定时任务
      timers.value = await ipcService.getTimers()
      lastSyncTime.value = new Date()
    } catch (error) {
      console.error('加载定时任务失败:', error)
      ElMessage.error('加载定时任务失败')
    } finally {
      isLoading.value = false
    }
  }

  // 创建定时任务
  async function createTimer(params: CreateTimerParams): Promise<Timer | null> {
    isLoading.value = true
    try {
      const timer = await ipcService.createTimer(params)
      timers.value.push(timer)
      ElMessage.success(`定时任务 "${timer.name}" 已创建`)
      return timer
    } catch (error) {
      console.error('创建定时任务失败:', error)
      ElMessage.error('创建定时任务失败')
      return null
    } finally {
      isLoading.value = false
    }
  }

  // 更新定时任务
  async function updateTimer(timerId: string, updates: UpdateTimerParams): Promise<Timer | null> {
    isLoading.value = true
    try {
      const timer = await ipcService.updateTimer(timerId, updates)
      if (timer) {
        const index = timers.value.findIndex(t => t.id === timerId)
        if (index !== -1) {
          timers.value[index] = timer
        }
        if (selectedTimer.value?.id === timerId) {
          selectedTimer.value = timer
        }
        ElMessage.success('定时任务已更新')
      }
      return timer
    } catch (error) {
      console.error('更新定时任务失败:', error)
      ElMessage.error('更新定时任务失败')
      return null
    } finally {
      isLoading.value = false
    }
  }

  // 删除定时任务
  async function deleteTimer(timerId: string): Promise<boolean> {
    isLoading.value = true
    try {
      const success = await ipcService.deleteTimer(timerId)
      if (success) {
        timers.value = timers.value.filter(t => t.id !== timerId)
        if (selectedTimer.value?.id === timerId) {
          selectedTimer.value = null
        }
        ElMessage.success('定时任务已删除')
      }
      return success
    } catch (error) {
      console.error('删除定时任务失败:', error)
      ElMessage.error('删除定时任务失败')
      return false
    } finally {
      isLoading.value = false
    }
  }

  // 启用/暂停定时任务
  async function toggleTimer(timerId: string): Promise<Timer | null> {
    const timer = timers.value.find(t => t.id === timerId)
    if (!timer) return null

    const newStatus = timer.status === 'active' ? 'paused' : 'active'
    return updateTimer(timerId, { status: newStatus })
  }

  // 手动触发定时任务
  async function triggerTimer(timerId: string): Promise<boolean> {
    try {
      const success = await ipcService.triggerTimer(timerId)
      if (success) {
        ElMessage.success('定时任务已手动触发')
      }
      return success
    } catch (error) {
      console.error('触发定时任务失败:', error)
      ElMessage.error('触发定时任务失败')
      return false
    }
  }

  // 选中定时任务
  function selectTimer(timer: Timer | null): void {
    selectedTimer.value = timer
  }

  // 根据 ID 获取定时任务
  function getTimerById(id: string): Timer | undefined {
    return timers.value.find(t => t.id === id)
  }

  // 设置事件监听器
  function setupEventListeners(): void {
    ipcService.on('timerCreated', (timer: Timer) => {
      const exists = timers.value.find(t => t.id === timer.id)
      if (!exists) {
        timers.value.push(timer)
      }
    })

    ipcService.on('timerUpdated', (timer: Timer) => {
      const index = timers.value.findIndex(t => t.id === timer.id)
      if (index !== -1) {
        timers.value[index] = timer
      }
    })

    ipcService.on('timerDeleted', (timerId: string) => {
      timers.value = timers.value.filter(t => t.id !== timerId)
    })

    ipcService.on('timerTriggered', (data: { timerId: string; timerName: string }) => {
      ElMessage.info(`定时任务 "${data.timerName}" 已触发`)
    })
  }

  // 清理事件监听器
  function cleanupEventListeners(): void {
    ipcService.off('timerCreated')
    ipcService.off('timerUpdated')
    ipcService.off('timerDeleted')
    ipcService.off('timerTriggered')
  }

  return {
    // State
    timers,
    selectedTimer,
    isLoading,
    lastSyncTime,

    // Getters
    timersByStatus,
    upcomingTimers,
    stats,

    // Actions
    loadTimers,
    createTimer,
    updateTimer,
    deleteTimer,
    toggleTimer,
    triggerTimer,
    selectTimer,
    getTimerById,
    setupEventListeners,
    cleanupEventListeners
  }
})
