<template>
  <div class="scenes-view">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">情景管理</h1>
        <el-tag type="info" effect="plain">
          共 {{ sceneStore.sceneCount }} 个情景
        </el-tag>
      </div>
      <div class="header-right">
        <el-button
          type="primary"
          :icon="Refresh"
          :loading="sceneStore.isLoading"
          @click="handleRefresh"
        >
          同步情景
        </el-button>
      </div>
    </div>

    <!-- 登录提示 -->
    <el-alert
      v-if="!authStore.isAuthenticated"
      title="请先登录云端账号"
      type="warning"
      show-icon
      :closable="false"
      class="auth-alert"
    >
      <template #default>
        <span>情景管理需要登录 Yeelight 账号才能访问。</span>
        <el-button type="primary" link @click="navigateToSettings">
          前往设置登录
        </el-button>
      </template>
    </el-alert>

    <!-- 情景列表 -->
    <div class="scenes-content" v-loading="sceneStore.isLoading">
      <!-- 空状态 -->
      <el-empty
        v-if="sceneStore.scenes.length === 0 && !sceneStore.isLoading"
        :description="emptyText"
      >
        <el-button
          v-if="authStore.isAuthenticated"
          type="primary"
          @click="handleRefresh"
        >
          刷新情景
        </el-button>
      </el-empty>

      <!-- 情景网格 -->
      <div class="scenes-grid" v-else>
        <el-card
          v-for="scene in sceneStore.scenes"
          :key="scene.id"
          class="scene-card"
          shadow="hover"
        >
          <div class="scene-header">
            <div class="scene-icon">
              <el-icon :size="28">
                <MagicStick />
              </el-icon>
            </div>
            <div class="scene-info">
              <h3 class="scene-name">{{ scene.name }}</h3>
              <span class="action-count">{{ scene.actions?.length || 0 }} 个动作</span>
            </div>
          </div>

          <div class="scene-actions-list" v-if="scene.actions?.length">
            <el-tag
              v-for="(action, index) in scene.actions.slice(0, 3)"
              :key="index"
              size="small"
              :type="getActionTagType(action.type)"
            >
              {{ getActionLabel(action) }}
            </el-tag>
            <el-tag
              v-if="scene.actions.length > 3"
              size="small"
              type="info"
            >
              +{{ scene.actions.length - 3 }}
            </el-tag>
          </div>

          <div class="scene-footer">
            <el-button
              type="primary"
              :icon="VideoPlay"
              :loading="sceneStore.isExecuting"
              @click="handleExecute(scene.id)"
            >
              执行情景
            </el-button>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Refresh, MagicStick, VideoPlay } from '@element-plus/icons-vue'
import { useSceneStore } from '@/renderer/stores/scene'
import { useAuthStore } from '@/renderer/stores/auth'
import type { SceneAction, SceneActionType } from '@/renderer/types/scene'
import { ElMessage } from 'element-plus'

const router = useRouter()
const sceneStore = useSceneStore()
const authStore = useAuthStore()

// 计算属性
const emptyText = computed(() => {
  if (!authStore.isAuthenticated) {
    return '请先登录云端账号'
  }
  return '暂无情景数据'
})

// 方法
const handleRefresh = () => {
  if (!authStore.isAuthenticated) {
    ElMessage.warning('请先登录云端账号')
    return
  }
  sceneStore.syncScenes()
}

const navigateToSettings = () => {
  router.push('/settings')
}

const handleExecute = async (sceneId: string) => {
  await sceneStore.executeScene(sceneId)
}

const getActionTagType = (type: SceneActionType): 'primary' | 'success' | 'warning' | 'danger' | 'info' => {
  const typeMap: Record<SceneActionType, 'primary' | 'success' | 'warning' | 'danger' | 'info'> = {
    power: 'success',
    brightness: 'warning',
    color_temp: 'info',
    rgb: 'danger',
    delay: 'primary'
  }
  return typeMap[type] || 'info'
}

const getActionLabel = (action: SceneAction): string => {
  const labelMap: Record<SceneActionType, string> = {
    power: action.value ? '开启' : '关闭',
    brightness: `亮度 ${action.value}%`,
    color_temp: `色温 ${action.value}K`,
    rgb: '颜色',
    delay: `延迟 ${action.value}ms`
  }
  return labelMap[action.type] || action.type
}

// 生命周期
onMounted(() => {
  sceneStore.setupEventListeners()
  if (authStore.isAuthenticated && sceneStore.scenes.length === 0) {
    sceneStore.syncScenes()
  }
})

onUnmounted(() => {
  sceneStore.cleanupEventListeners()
})
</script>

<style scoped lang="scss">
.scenes-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: var(--spacing-lg);
  gap: var(--spacing-lg);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-md);
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.page-title {
  margin: 0;
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--color-text-primary);
}

.auth-alert {
  flex-shrink: 0;

  :deep(.el-alert__content) {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }
}

.scenes-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.scenes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--spacing-lg);
}

.scene-card {
  transition: all var(--transition-normal);

  &:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg);
  }

  :deep(.el-card__body) {
    padding: var(--spacing-md);
  }
}

.scene-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.scene-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--color-success-light), var(--color-success));
  border-radius: var(--radius-lg);
  color: #ffffff;
}

.scene-info {
  flex: 1;
}

.scene-name {
  margin: 0 0 var(--spacing-xs);
  font-size: var(--font-size-md);
  font-weight: 600;
  color: var(--color-text-primary);
}

.action-count {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.scene-actions-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-md);
}

.scene-footer {
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--color-border-light);

  .el-button {
    width: 100%;
  }
}
</style>
