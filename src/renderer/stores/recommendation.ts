/**
 * Recommendation Store - AI场景推荐状态管理
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { RecommendationScene, UserPreferences, RecommendationResult } from '@/renderer/types/recommendation'
import ipcService from '@/renderer/services/ipc.service'
import { ElMessage } from 'element-plus'

export const useRecommendationStore = defineStore('recommendation', () => {
  // ==================== State ====================

  // 推荐结果
  const recommendations = ref<Array<{
    scene: RecommendationScene
    score: number
    reason: string
  }>>([])

  // 所有场景
  const scenes = ref<RecommendationScene[]>([])

  // 用户偏好
  const userPreferences = ref<UserPreferences>({
    preferredScenes: [],
    dislikedScenes: [],
    autoApplyEnabled: false,
    notificationEnabled: true,
    energySavingPriority: 'medium',
    comfortPriority: 'medium'
  })

  // 使用统计
  const usageStats = ref<{
    totalScenes: number
    totalUsage: number
    topScenes: Array<{ id: string; name: string; usageCount: number }>
    avgSatisfaction: number
  } | null>(null)

  // 是否正在加载
  const isLoading = ref(false)

  // 最后推荐时间
  const lastRecommendationTime = ref<Date | null>(null)

  // 当前上下文
  const currentContext = ref<{
    timeOfDay: string
    isWeekend: boolean
    weather?: string
  } | null>(null)

  // ==================== Getters ====================

  // 高优先级推荐
  const highPriorityRecommendations = computed(() =>
    recommendations.value.filter(r => r.scene.priority === 'high')
  )

  // 根据类型分组的场景
  const scenesByType = computed(() => {
    const grouped: Record<string, RecommendationScene[]> = {}
    for (const scene of scenes.value) {
      if (!grouped[scene.type]) {
        grouped[scene.type] = []
      }
      grouped[scene.type].push(scene)
    }
    return grouped
  })

  // 最常使用的场景
  const topUsedScenes = computed(() =>
    [...scenes.value]
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 5)
  )

  // 满意度最高的场景
  const topRatedScenes = computed(() =>
    [...scenes.value]
      .sort((a, b) => b.satisfactionScore - a.satisfactionScore)
      .slice(0, 5)
  )

  // ==================== Actions ====================

  /**
   * 生成推荐
   */
  async function generateRecommendations(): Promise<void> {
    isLoading.value = true
    try {
      const result = await ipcService.getAIRecommendations()
      if (result && result.recommendations) {
        recommendations.value = result.recommendations.map(r => ({
          scene: r.scene,
          score: r.score,
          reason: r.reason
        }))
        currentContext.value = result.context ? {
          timeOfDay: result.context.timeOfDay,
          isWeekend: result.context.isWeekend,
          weather: result.context.weather?.condition
        } : null
        lastRecommendationTime.value = new Date()
      }
    } catch (error) {
      console.error('生成推荐失败:', error)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 加载所有场景
   */
  async function loadScenes(): Promise<void> {
    isLoading.value = true
    try {
      const result = await ipcService.getAIScenes()
      if (result && result.scenes) {
        scenes.value = result.scenes
      }
    } catch (error) {
      console.error('加载场景失败:', error)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 应用场景
   */
  async function applyScene(sceneId: string): Promise<boolean> {
    isLoading.value = true
    try {
      const result = await ipcService.applyAIScene(sceneId)
      if (result.success) {
        ElMessage.success('场景已应用')
        // 更新使用统计
        await loadScenes()
        return true
      } else {
        ElMessage.error('应用场景失败')
        return false
      }
    } catch (error) {
      console.error('应用场景失败:', error)
      ElMessage.error('应用场景失败')
      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 记录反馈
   */
  async function recordFeedback(sceneId: string, feedback: {
    rating?: number
    preferred?: boolean
    disliked?: boolean
  }): Promise<void> {
    try {
      await ipcService.recordAIRecommendationFeedback(sceneId, feedback)

      // 更新本地状态
      const scene = scenes.value.find(s => s.id === sceneId)
      if (scene) {
        if (feedback.preferred) {
          if (!userPreferences.value.preferredScenes.includes(sceneId)) {
            userPreferences.value.preferredScenes.push(sceneId)
          }
          userPreferences.value.dislikedScenes = userPreferences.value.dislikedScenes.filter(id => id !== sceneId)
        } else if (feedback.disliked) {
          if (!userPreferences.value.dislikedScenes.includes(sceneId)) {
            userPreferences.value.dislikedScenes.push(sceneId)
          }
          userPreferences.value.preferredScenes = userPreferences.value.preferredScenes.filter(id => id !== sceneId)
        }
      }

      ElMessage.success('感谢您的反馈')
    } catch (error) {
      console.error('记录反馈失败:', error)
    }
  }

  /**
   * 创建自定义场景
   */
  async function createCustomScene(sceneData: Partial<RecommendationScene>): Promise<RecommendationScene | null> {
    isLoading.value = true
    try {
      const result = await ipcService.createAICustomScene(sceneData)
      if (result && result.scene) {
        scenes.value.push(result.scene)
        ElMessage.success('自定义场景已创建')
        return result.scene
      }
      return null
    } catch (error) {
      console.error('创建自定义场景失败:', error)
      ElMessage.error('创建自定义场景失败')
      return null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 更新场景
   */
  async function updateScene(sceneId: string, updates: Partial<RecommendationScene>): Promise<boolean> {
    try {
      const result = await ipcService.updateAIScene(sceneId, updates)
      if (result && result.scene) {
        const index = scenes.value.findIndex(s => s.id === sceneId)
        if (index !== -1) {
          scenes.value[index] = result.scene
        }
        ElMessage.success('场景已更新')
        return true
      }
      return false
    } catch (error) {
      console.error('更新场景失败:', error)
      ElMessage.error('更新场景失败')
      return false
    }
  }

  /**
   * 删除场景
   */
  async function deleteScene(sceneId: string): Promise<boolean> {
    try {
      const result = await ipcService.deleteAIScene(sceneId)
      if (result.success) {
        scenes.value = scenes.value.filter(s => s.id !== sceneId)
        ElMessage.success('场景已删除')
        return true
      }
      return false
    } catch (error) {
      console.error('删除场景失败:', error)
      ElMessage.error('删除场景失败')
      return false
    }
  }

  /**
   * 加载使用统计
   */
  async function loadUsageStats(): Promise<void> {
    try {
      const result = await ipcService.getAIUsageStats()
      if (result) {
        usageStats.value = result
      }
    } catch (error) {
      console.error('加载使用统计失败:', error)
    }
  }

  /**
   * 更新用户偏好
   */
  async function updateUserPreferences(prefs: Partial<UserPreferences>): Promise<void> {
    try {
      await ipcService.updateAIPreferences(prefs)
      userPreferences.value = {
        ...userPreferences.value,
        ...prefs
      }
      ElMessage.success('偏好设置已更新')
    } catch (error) {
      console.error('更新偏好失败:', error)
    }
  }

  /**
   * 设置事件监听器
   */
  function setupEventListeners(): void {
    ipcService.on('aiRecommendationsGenerated', (data: RecommendationResult) => {
      if (data && data.recommendations) {
        recommendations.value = data.recommendations.map(r => ({
          scene: r.scene,
          score: r.score,
          reason: r.reason
        }))
        currentContext.value = data.context ? {
          timeOfDay: data.context.timeOfDay,
          isWeekend: data.context.isWeekend,
          weather: data.context.weather?.condition
        } : null
        lastRecommendationTime.value = new Date()
      }
    })

    ipcService.on('aiSceneApplied', (data: { sceneId: string }) => {
      loadScenes()
      loadUsageStats()
    })
  }

  /**
   * 清理事件监听器
   */
  function cleanupEventListeners(): void {
    ipcService.off('aiRecommendationsGenerated')
    ipcService.off('aiSceneApplied')
  }

  return {
    // State
    recommendations,
    scenes,
    userPreferences,
    usageStats,
    isLoading,
    lastRecommendationTime,
    currentContext,

    // Getters
    highPriorityRecommendations,
    scenesByType,
    topUsedScenes,
    topRatedScenes,

    // Actions
    generateRecommendations,
    loadScenes,
    applyScene,
    recordFeedback,
    createCustomScene,
    updateScene,
    deleteScene,
    loadUsageStats,
    updateUserPreferences,
    setupEventListeners,
    cleanupEventListeners
  }
})
