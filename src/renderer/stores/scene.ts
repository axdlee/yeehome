/**
 * Scene Store - 情景状态管理
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Scene } from '@/renderer/types/scene'
import ipcService from '@/renderer/services/ipc.service'
import { ElMessage } from 'element-plus'

export const useSceneStore = defineStore('scene', () => {
  // ==================== State ====================

  const scenes = ref<Scene[]>([])
  const isLoading = ref(false)
  const isExecuting = ref(false)

  // ==================== Getters ====================

  const sceneCount = computed(() => scenes.value.length)

  // ==================== Actions ====================

  // 同步情景列表
  async function syncScenes(): Promise<void> {
    isLoading.value = true
    try {
      const cloudScenes = await ipcService.cloudSyncScenes()
      scenes.value = cloudScenes
    } catch (error) {
      console.error('同步情景失败:', error)
      ElMessage.error('同步情景失败')
    } finally {
      isLoading.value = false
    }
  }

  // 获取情景列表
  async function fetchScenes(): Promise<void> {
    isLoading.value = true
    try {
      scenes.value = await ipcService.cloudGetScenes()
    } catch (error) {
      console.error('获取情景失败:', error)
    } finally {
      isLoading.value = false
    }
  }

  // 执行情景
  async function executeScene(sceneId: string): Promise<boolean> {
    isExecuting.value = true
    try {
      const success = await ipcService.cloudExecuteScene(sceneId)
      if (success) {
        ElMessage.success('情景执行成功')
      }
      return success
    } catch (error) {
      console.error('执行情景失败:', error)
      ElMessage.error('执行情景失败')
      return false
    } finally {
      isExecuting.value = false
    }
  }

  // 根据ID获取情景
  function getSceneById(id: string): Scene | undefined {
    return scenes.value.find(s => s.id === id)
  }

  // ==================== 事件监听 ====================

  function setupEventListeners(): void {
    ipcService.on('cloudScenesSynced', (cloudScenes: Scene[]) => {
      scenes.value = cloudScenes
    })

    ipcService.on('cloudSceneExecuted', (sceneId: string) => {
      ElMessage.success('情景已执行')
    })
  }

  function cleanupEventListeners(): void {
    ipcService.off('cloudScenesSynced')
    ipcService.off('cloudSceneExecuted')
  }

  return {
    // State
    scenes,
    isLoading,
    isExecuting,
    // Getters
    sceneCount,
    // Actions
    syncScenes,
    fetchScenes,
    executeScene,
    getSceneById,
    // 事件监听
    setupEventListeners,
    cleanupEventListeners
  }
})
