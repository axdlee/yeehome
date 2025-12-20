<template>
  <div
    class="recommendation-card"
    :style="{ borderLeftColor: recommendation.scene.color }"
  >
    <!-- 卡片头部 -->
    <div class="card-header">
      <div class="scene-info">
        <el-icon :size="24" :style="{ color: recommendation.scene.color }">
          <component :is="getSceneIcon(recommendation.scene.icon)" />
        </el-icon>
        <div class="scene-details">
          <div class="scene-name">{{ recommendation.scene.name }}</div>
          <div class="scene-description">{{ recommendation.scene.description }}</div>
        </div>
      </div>
      <div class="score-badge" :class="getScoreClass(recommendation.score)">
        {{ recommendation.score }}%
      </div>
    </div>

    <!-- 推荐理由 -->
    <div class="card-reason">
      <el-icon><InfoFilled /></el-icon>
      <span>{{ recommendation.reason }}</span>
    </div>

    <!-- 优先级标签 -->
    <div class="card-tags">
      <el-tag
        :type="getPriorityType(recommendation.scene.priority)"
        size="small"
        effect="plain"
      >
        {{ getPriorityLabel(recommendation.scene.priority) }}
      </el-tag>
      <el-tag
        v-if="recommendation.scene.usageCount > 0"
        size="small"
        effect="plain"
      >
        已使用 {{ recommendation.scene.usageCount }} 次
      </el-tag>
    </div>

    <!-- 满意度评分 -->
    <div class="satisfaction-bar">
      <span class="satisfaction-label">满意度</span>
      <el-progress
        :percentage="recommendation.scene.satisfactionScore"
        :color="getSatisfactionColor(recommendation.scene.satisfactionScore)"
        :stroke-width="6"
        :show-text="false"
      />
      <span class="satisfaction-value">{{ recommendation.scene.satisfactionScore }}%</span>
    </div>

    <!-- 操作按钮 -->
    <div class="card-actions">
      <el-button
        type="primary"
        size="small"
        :icon="Check"
        @click="$emit('apply', recommendation.scene.id)"
      >
        应用场景
      </el-button>
      <el-button
        size="small"
        :icon="Star"
        :type="isPreferred ? 'warning' : ''"
        plain
        @click="handlePreferred"
      >
        {{ isPreferred ? '已收藏' : '收藏' }}
      </el-button>
      <el-button
        size="small"
        :icon="Close"
        plain
        @click="handleDisliked"
      >
        不喜欢
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { InfoFilled, Check, Star, Close } from '@element-plus/icons-vue'
import { useRecommendationStore } from '@/renderer/stores/recommendation'
import type { RecommendationScene } from '@/renderer/types/recommendation'

interface RecommendationItem {
  scene: RecommendationScene
  score: number
  reason: string
}

const props = defineProps<{
  recommendation: RecommendationItem
}>()

const emit = defineEmits<{
  (e: 'apply', sceneId: string): void
  (e: 'feedback', sceneId: string, feedback: { preferred?: boolean; disliked?: boolean }): void
}>()

const recommendationStore = useRecommendationStore()

// 是否已收藏
const isPreferred = computed(() =>
  recommendationStore.userPreferences.preferredScenes.includes(props.recommendation.scene.id)
)

// 获取场景图标
function getSceneIcon(iconName: string): string {
  const iconMap: Record<string, string> = {
    Sunrise: 'Sunrise',
    Moon: 'Moon',
    Lock: 'Lock',
    Key: 'Key',
    VideoCamera: 'VideoCamera',
    Book: 'Book',
    Monitor: 'Monitor',
    Party: 'Party',
    Heart: 'Heart',
    Leaf: 'Leaf',
    Aim: 'Aim',
    Coffee: 'Coffee',
    Magic: 'Magic'
  }
  return iconMap[iconName] || 'Magic'
}

// 获取分数样式类
function getScoreClass(score: number): string {
  if (score >= 80) return 'high'
  if (score >= 60) return 'medium'
  return 'low'
}

// 获取优先级类型
function getPriorityType(priority: string): string {
  const typeMap: Record<string, string> = {
    high: 'danger',
    medium: 'warning',
    low: 'info'
  }
  return typeMap[priority] || 'info'
}

// 获取优先级标签
function getPriorityLabel(priority: string): string {
  const labelMap: Record<string, string> = {
    high: '推荐',
    medium: '可选',
    low: '一般'
  }
  return labelMap[priority] || priority
}

// 获取满意度颜色
function getSatisfactionColor(score: number): string {
  if (score >= 80) return '#67C23A'
  if (score >= 60) return '#E6A23C'
  return '#F56C6C'
}

// 收藏
function handlePreferred() {
  emit('feedback', props.recommendation.scene.id, {
    preferred: !isPreferred.value
  })
}

// 不喜欢
function handleDisliked() {
  emit('feedback', props.recommendation.scene.id, {
    disliked: true
  })
}
</script>

<style scoped lang="scss">
.recommendation-card {
  background: var(--color-bg-light);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  border-left: 4px solid;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    transform: translateX(4px);
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-sm);
}

.scene-info {
  display: flex;
  gap: var(--spacing-sm);
}

.scene-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.scene-name {
  font-size: var(--font-size-md);
  font-weight: 600;
  color: var(--color-text-primary);
}

.scene-description {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.score-badge {
  font-size: var(--font-size-lg);
  font-weight: 700;
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);

  &.high {
    color: #67C23A;
    background: rgba(103, 194, 58, 0.1);
  }

  &.medium {
    color: #E6A23C;
    background: rgba(230, 162, 60, 0.1);
  }

  &.low {
    color: #909399;
    background: rgba(144, 147, 153, 0.1);
  }
}

.card-reason {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm);
  background: rgba(103, 58, 183, 0.05);
  border-radius: var(--radius-sm);
  margin-bottom: var(--spacing-sm);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);

  .el-icon {
    color: var(--color-primary);
    flex-shrink: 0;
    margin-top: 2px;
  }
}

.card-tags {
  display: flex;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-sm);
  flex-wrap: wrap;
}

.satisfaction-bar {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.satisfaction-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.satisfaction-bar .el-progress {
  flex: 1;
}

.satisfaction-value {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  min-width: 36px;
  text-align: right;
}

.card-actions {
  display: flex;
  gap: var(--spacing-sm);

  .el-button {
    flex: 1;
  }
}
</style>
