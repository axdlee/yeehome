/**
 * Automation Store - 自动化状态管理
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Automation } from '@/renderer/types/automation'
import ipcService from '@/renderer/services/ipc.service'
import { ElMessage } from 'element-plus'

export const useAutomationStore = defineStore('automation', () => {
  // ==================== State ====================

  const automations = ref<Automation[]>([])
  const isLoading = ref(false)
  const selectedAutomation = ref<Automation | null>(null)

  // ==================== Getters ====================

  const automationCount = computed(() => automations.value.length)

  const enabledAutomations = computed(() =>
    automations.value.filter(a => a.enabled)
  )

  const disabledAutomations = computed(() =>
    automations.value.filter(a => !a.enabled)
  )

  // ==================== Actions ====================

  // 同步自动化列表
  async function syncAutomations(): Promise<void> {
    isLoading.value = true
    try {
      const cloudAutomations = await ipcService.cloudSyncAutomations()
      automations.value = cloudAutomations
    } catch (error) {
      console.error('同步自动化失败:', error)
      ElMessage.error('同步自动化失败')
    } finally {
      isLoading.value = false
    }
  }

  // 获取自动化列表
  async function fetchAutomations(): Promise<void> {
    isLoading.value = true
    try {
      automations.value = await ipcService.cloudGetAutomations()
    } catch (error) {
      console.error('获取自动化失败:', error)
    } finally {
      isLoading.value = false
    }
  }

  // 启用自动化
  async function enableAutomation(automationId: string): Promise<boolean> {
    try {
      const success = await ipcService.cloudEnableAutomation(automationId)
      if (success) {
        const automation = automations.value.find(a => a.id === automationId)
        if (automation) {
          automation.enabled = true
        }
        ElMessage.success('自动化已启用')
      }
      return success
    } catch (error) {
      console.error('启用自动化失败:', error)
      ElMessage.error('启用自动化失败')
      return false
    }
  }

  // 禁用自动化
  async function disableAutomation(automationId: string): Promise<boolean> {
    try {
      const success = await ipcService.cloudDisableAutomation(automationId)
      if (success) {
        const automation = automations.value.find(a => a.id === automationId)
        if (automation) {
          automation.enabled = false
        }
        ElMessage.success('自动化已禁用')
      }
      return success
    } catch (error) {
      console.error('禁用自动化失败:', error)
      ElMessage.error('禁用自动化失败')
      return false
    }
  }

  // 切换自动化状态
  async function toggleAutomation(automationId: string): Promise<boolean> {
    const automation = automations.value.find(a => a.id === automationId)
    if (!automation) return false

    return automation.enabled
      ? disableAutomation(automationId)
      : enableAutomation(automationId)
  }

  // 根据ID获取自动化
  function getAutomationById(id: string): Automation | undefined {
    return automations.value.find(a => a.id === id)
  }

  // 选中自动化
  function selectAutomation(automation: Automation | null): void {
    selectedAutomation.value = automation
  }

  // ==================== 事件监听 ====================

  function setupEventListeners(): void {
    ipcService.on('cloudAutomationsSynced', (cloudAutomations: Automation[]) => {
      automations.value = cloudAutomations
    })
  }

  function cleanupEventListeners(): void {
    ipcService.off('cloudAutomationsSynced')
  }

  return {
    // State
    automations,
    isLoading,
    selectedAutomation,
    // Getters
    automationCount,
    enabledAutomations,
    disabledAutomations,
    // Actions
    syncAutomations,
    fetchAutomations,
    enableAutomation,
    disableAutomation,
    toggleAutomation,
    getAutomationById,
    selectAutomation,
    // 事件监听
    setupEventListeners,
    cleanupEventListeners
  }
})
