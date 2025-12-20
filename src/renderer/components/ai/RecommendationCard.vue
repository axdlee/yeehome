<template>
  <div
    class="recommendation-card"
    :style="{ borderLeftColor: recommendation.scene.color }"
  >
    <!-- 渐变边框效果 -->
    <div class="card-border-gradient"></div>

    <!-- 卡片内容 -->
    <div class="card-content">
      <!-- 卡片头部 -->
      <div class="card-header">
        <div class="scene-info">
          <div class="scene-icon-wrapper" :style="{ background: `${recommendation.scene.color}20` }">
            <el-icon :size="22" :style="{ color: recommendation.scene.color }">
              <component :is="getSceneIcon(recommendation.scene.icon)" />
            </el-icon>
          </div>
          <div class="scene-details">
            <div class="scene-name">{{ recommendation.scene.name }}</div>
            <div class="scene-description">{{ recommendation.scene.description }}</div>
          </div>
        </div>
        <div class="score-container">
          <div class="score-badge" :class="getScoreClass(recommendation.score)">
            <span class="score-value">{{ recommendation.score }}</span>
            <span class="score-unit">%</span>
          </div>
          <div class="score-label">匹配度</div>
        </div>
      </div>

      <!-- 推荐理由 -->
      <div class="card-reason">
        <div class="reason-icon">
          <el-icon><InfoFilled /></el-icon>
        </div>
        <div class="reason-content">
          <span class="reason-text">{{ recommendation.reason }}</span>
        </div>
      </div>

      <!-- 标签区域 -->
      <div class="card-tags">
        <div class="priority-tag" :class="`priority-${recommendation.scene.priority}`">
          <span class="priority-dot"></span>
          {{ getPriorityLabel(recommendation.scene.priority) }}
        </div>
        <div v-if="recommendation.scene.usageCount > 0" class="usage-tag">
          <el-icon><Top /></el-icon>
          已使用 {{ recommendation.scene.usageCount }} 次
        </div>
      </div>

      <!-- 满意度进度条 -->
      <div class="satisfaction-section">
        <div class="satisfaction-header">
          <span class="satisfaction-label">用户满意度</span>
          <span class="satisfaction-value" :style="{ color: getSatisfactionColor(recommendation.scene.satisfactionScore) }">
            {{ recommendation.scene.satisfactionScore }}%
          </span>
        </div>
        <div class="satisfaction-bar">
          <div
            class="satisfaction-progress"
            :style="{
              width: `${recommendation.scene.satisfactionScore}%`,
              background: getSatisfactionGradient(recommendation.scene.satisfactionScore)
            }"
          ></div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="card-actions">
        <el-button
          type="primary"
          class="action-btn apply-btn"
          :icon="Check"
          @click="$emit('apply', recommendation.scene.id)"
        >
          <span>应用场景</span>
          <div class="btn-glow"></div>
        </el-button>
        <div class="action-group">
          <el-button
            class="action-btn icon-btn"
            :class="{ active: isPreferred }"
            :icon="Star"
            @click="handlePreferred"
          >
            <span v-if="isPreferred">已收藏</span>
          </el-button>
          <el-button
            class="action-btn icon-btn"
            :icon="Close"
            @click="handleDisliked"
          >
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { InfoFilled, Check, Star, Close, Top } from '@element-plus/icons-vue'
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
  if (score >= 80) return '#10b981'
  if (score >= 60) return '#f59e0b'
  return '#ef4444'
}

// 获取满意度渐变
function getSatisfactionGradient(score: number): string {
  if (score >= 80) {
    return 'linear-gradient(90deg, #10b981 0%, #34d399 100%)'
  }
  if (score >= 60) {
    return 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)'
  }
  return 'linear-gradient(90deg, #ef4444 0%, #f87171 100%)'
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
  position: relative;
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: all var(--transition-spring);

  // 渐变边框
  .card-border-gradient {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 2px;
    background: var(--gradient-primary);
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    opacity: 0;
    transition: opacity var(--transition-normal);
    pointer-events: none;
  }

  .card-content {
    position: relative;
    z-index: 1;
    padding: var(--spacing-md);
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);

    .card-border-gradient {
      opacity: 0.6;
    }
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-md);
}

.scene-info {
  display: flex;
  gap: var(--spacing-sm);
}

.scene-icon-wrapper {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
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
  line-height: 1.4;
}

.score-container {
  text-align: center;
}

.score-badge {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-md);
  background: rgba(59, 130, 246, 0.1);

  &.high {
    background: rgba(16, 185, 129, 0.1);

    .score-value {
      color: #10b981;
    }
  }

  &.medium {
    background: rgba(245, 158, 11, 0.1);

    .score-value {
      color: #f59e0b;
    }
  }

  &.low {
    background: rgba(148, 163, 184, 0.1);

    .score-value {
      color: #94a3b8;
    }
  }
}

.score-value {
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--color-primary);
  line-height: 1;
}

.score-unit {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  margin-top: 2px;
}

.score-label {
  font-size: 10px;
  color: var(--color-text-placeholder);
  margin-top: 2px;
}

.card-reason {
  display: flex;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: rgba(59, 130, 246, 0.05);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-md);
}

.reason-icon {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(59, 130, 246, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  .el-icon {
    font-size: 12px;
    color: var(--color-primary);
  }
}

.reason-content {
  flex: 1;
}

.reason-text {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.card-tags {
  display: flex;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
  flex-wrap: wrap;
}

.priority-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px var(--spacing-sm);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 500;

  .priority-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }

  &.priority-high {
    background: rgba(16, 185, 129, 0.1);
    color: #10b981;

    .priority-dot {
      background: #10b981;
      box-shadow: 0 0 6px #10b981;
    }
  }

  &.priority-medium {
    background: rgba(245, 158, 11, 0.1);
    color: #f59e0b;

    .priority-dot {
      background: #f59e0b;
    }
  }

  &.priority-low {
    background: rgba(148, 163, 184, 0.1);
    color: #94a3b8;

    .priority-dot {
      background: #94a3b8;
    }
  }
}

.usage-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px var(--spacing-sm);
  border-radius: var(--radius-full);
  background: rgba(99, 102, 241, 0.1);
  color: var(--color-info);
  font-size: var(--font-size-xs);

  .el-icon {
    font-size: 12px;
  }
}

.satisfaction-section {
  margin-bottom: var(--spacing-md);
}

.satisfaction-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-xs);
}

.satisfaction-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.satisfaction-value {
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.satisfaction-bar {
  height: 6px;
  background: var(--color-border-light);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.satisfaction-progress {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 0.8s ease-out;
}

.card-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.action-btn {
  height: 36px;
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  transition: all var(--transition-fast);

  &.apply-btn {
    flex: 1;
    position: relative;
    overflow: hidden;
    border: none;

    .btn-glow {
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(255, 255, 255, 0.2) 50%,
        transparent 100%
      );
      animation: btn-shine 3s infinite;
    }

    &:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-glow);
    }
  }

  &.icon-btn {
    width: 36px;
    padding: 0;
    background: rgba(148, 163, 184, 0.1);
    border: 1px solid var(--color-border-light);
    color: var(--color-text-secondary);

    &:hover {
      background: rgba(59, 130, 246, 0.1);
      border-color: var(--color-primary);
      color: var(--color-primary);
      transform: translateY(-2px);
    }

    &.active {
      background: rgba(245, 158, 11, 0.1);
      border-color: var(--color-warning);
      color: var(--color-warning);
    }
  }
}

.action-group {
  display: flex;
  gap: var(--spacing-xs);
}

@keyframes btn-shine {
  0% {
    left: -100%;
  }
  50%, 100% {
    left: 100%;
  }
}
</style>
