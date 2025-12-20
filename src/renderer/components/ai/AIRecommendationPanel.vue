<template>
  <div class="ai-recommendation-panel">
    <!-- 标题区域 -->
    <div class="panel-header">
      <div class="header-left">
        <el-icon class="ai-icon"><Opportunity /></el-icon>
        <span class="title">AI智能推荐</span>
      </div>
      <div class="header-right">
        <el-tag
          v-if="recommendationStore.currentContext"
          :type="getTimeOfDayTagType(recommendationStore.currentContext.timeOfDay)"
          size="small"
        >
          {{ getTimeOfDayLabel(recommendationStore.currentContext.timeOfDay) }}
        </el-tag>
        <el-button
          :icon="Refresh"
          circle
          size="small"
          :loading="recommendationStore.isLoading"
          @click="handleRefresh"
        />
      </div>
    </div>

    <!-- 推荐内容 -->
    <div v-loading="recommendationStore.isLoading" class="panel-content">
      <!-- 加载状态 -->
      <template v-if="recommendationStore.isLoading && recommendationStore.recommendations.length === 0">
        <div class="loading-placeholder">
          <el-icon class="loading-icon"><Loading /></el-icon>
          <span>正在分析您的设备状态...</span>
        </div>
      </template>

      <!-- 推荐列表 -->
      <template v-else-if="recommendationStore.recommendations.length > 0">
        <transition-group name="recommendation-list" tag="div" class="recommendation-list">
          <RecommendationCard
            v-for="item in recommendationStore.recommendations"
            :key="item.scene.id"
            :recommendation="item"
            @apply="handleApply"
            @feedback="handleFeedback"
          />
        </transition-group>
      </template>

      <!-- 空状态 -->
      <template v-else>
        <el-empty description="暂无推荐" :image-size="80">
          <template #description>
            <p>根据当前时间和设备状态生成推荐</p>
          </template>
          <el-button type="primary" @click="handleRefresh">
            立即刷新
          </el-button>
        </el-empty>
      </template>
    </div>

    <!-- 底部操作 -->
    <div class="panel-footer">
      <el-button
        text
        type="primary"
        :icon="View"
        @click="navigateToScenes"
      >
        查看所有场景
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Opportunity, Refresh, Loading, View } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import RecommendationCard from './RecommendationCard.vue'
import { useRecommendationStore } from '@/renderer/stores/recommendation'

const router = useRouter()
const recommendationStore = useRecommendationStore()

// 时间段标签类型
function getTimeOfDayTagType(timeOfDay: string): string {
  const typeMap: Record<string, string> = {
    dawn: 'warning',
    morning: 'success',
    noon: '',
    afternoon: 'warning',
    evening: 'info',
    night: 'danger',
    midnight: ''
  }
  return typeMap[timeOfDay] || ''
}

// 时间段标签文本
function getTimeOfDayLabel(timeOfDay: string): string {
  const labelMap: Record<string, string> = {
    dawn: '黎明',
    morning: '上午',
    noon: '中午',
    afternoon: '下午',
    evening: '傍晚',
    night: '夜晚',
    midnight: '深夜'
  }
  return labelMap[timeOfDay] || timeOfDay
}

// 刷新推荐
async function handleRefresh() {
  await recommendationStore.generateRecommendations()
}

// 应用场景
async function handleApply(sceneId: string) {
  await recommendationStore.applyScene(sceneId)
}

// 记录反馈
function handleFeedback(sceneId: string, feedback: { preferred?: boolean; disliked?: boolean }) {
  recommendationStore.recordFeedback(sceneId, feedback)
}

// 跳转到场景页面
function navigateToScenes() {
  router.push('/scenes')
}

// 设置事件监听
function setupEventListeners() {
  recommendationStore.setupEventListeners()
}

// 清理事件监听
function cleanupEventListeners() {
  recommendationStore.cleanupEventListeners()
}

onMounted(() => {
  recommendationStore.generateRecommendations()
  recommendationStore.loadScenes()
  setupEventListeners()
})

onUnmounted(() => {
  cleanupEventListeners()
})
</script>

<style scoped lang="scss">
.ai-recommendation-panel {
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: linear-gradient(135deg, rgba(103, 58, 183, 0.1) 0%, rgba(156, 39, 176, 0.05) 100%);
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.ai-icon {
  font-size: 24px;
  color: var(--color-primary);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-text-primary);
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.panel-content {
  min-height: 200px;
  max-height: 400px;
  overflow-y: auto;
  padding: var(--spacing-md);
}

.loading-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  padding: var(--spacing-xl);
  color: var(--color-text-secondary);
}

.loading-icon {
  font-size: 32px;
  animation: spin 1.5s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.recommendation-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.panel-footer {
  display: flex;
  justify-content: center;
  padding: var(--spacing-md);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

// 列表过渡动画
.recommendation-list-enter-active,
.recommendation-list-leave-active {
  transition: all 0.3s ease;
}

.recommendation-list-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.recommendation-list-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
