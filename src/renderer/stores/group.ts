/**
 * Group Store - 灯组状态管理
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Group } from '@/renderer/types/group'
import ipcService from '@/renderer/services/ipc.service'
import { ElMessage } from 'element-plus'

export const useGroupStore = defineStore('group', () => {
  // ==================== State ====================

  const groups = ref<Group[]>([])
  const isLoading = ref(false)
  const selectedGroup = ref<Group | null>(null)

  // ==================== Getters ====================

  const groupCount = computed(() => groups.value.length)

  // ==================== Actions ====================

  // 同步灯组列表
  async function syncGroups(): Promise<void> {
    isLoading.value = true
    try {
      const cloudGroups = await ipcService.cloudSyncGroups()
      groups.value = cloudGroups
    } catch (error) {
      console.error('同步灯组失败:', error)
      ElMessage.error('同步灯组失败')
    } finally {
      isLoading.value = false
    }
  }

  // 获取灯组列表
  async function fetchGroups(): Promise<void> {
    isLoading.value = true
    try {
      groups.value = await ipcService.cloudGetGroups()
    } catch (error) {
      console.error('获取灯组失败:', error)
    } finally {
      isLoading.value = false
    }
  }

  // 控制灯组电源
  async function toggleGroupPower(groupId: string, power: boolean): Promise<boolean> {
    try {
      const success = await ipcService.cloudToggleGroupPower(groupId, power)
      if (success) {
        ElMessage.success(`灯组已${power ? '开启' : '关闭'}`)
      }
      return success
    } catch (error) {
      console.error('灯组控制失败:', error)
      ElMessage.error('灯组控制失败')
      return false
    }
  }

  // 根据ID获取灯组
  function getGroupById(id: string): Group | undefined {
    return groups.value.find(g => g.id === id)
  }

  // 选中灯组
  function selectGroup(group: Group | null): void {
    selectedGroup.value = group
  }

  // ==================== 事件监听 ====================

  function setupEventListeners(): void {
    ipcService.on('cloudGroupsSynced', (cloudGroups: Group[]) => {
      groups.value = cloudGroups
    })
  }

  function cleanupEventListeners(): void {
    ipcService.off('cloudGroupsSynced')
  }

  return {
    // State
    groups,
    isLoading,
    selectedGroup,
    // Getters
    groupCount,
    // Actions
    syncGroups,
    fetchGroups,
    toggleGroupPower,
    getGroupById,
    selectGroup,
    // 事件监听
    setupEventListeners,
    cleanupEventListeners
  }
})
