<template>
  <div class="page-view">
    <!-- 页面头部 -->
    <PageHeader
      title="情景管理"
      :count="sceneStore.sceneCount"
      count-label="个情景"
      button-text="同步情景"
      :loading="sceneStore.isLoading"
      @refresh="handleRefresh"
    />

    <!-- 登录提示 -->
    <AuthAlert
      v-if="!authStore.isAuthenticated"
      feature-name="情景管理"
      @navigate="navigateToSettings"
    />

    <!-- 情景列表 -->
    <div class="page-content" v-loading="sceneStore.isLoading">
      <EmptyState
        v-if="sceneStore.scenes.length === 0 && !sceneStore.isLoading"
        :description="emptyText"
        button-text="刷新情景"
        :show-button="authStore.isAuthenticated"
        @action="handleRefresh"
      />

      <!-- 情景网格 -->
      <div class="card-grid" v-else>
        <el-card
          v-for="scene in sceneStore.scenes"
          :key="scene.id"
          class="hover-card"
          shadow="hover"
        >
          <div class="card-header">
            <div class="icon-box icon-box--success">
              <el-icon :size="28"><MagicStick /></el-icon>
            </div>
            <div class="card-info">
              <h3 class="card-title">{{ scene.name }}</h3>
              <span class="card-subtitle">{{ scene.actions?.length || 0 }} 个动作</span>
            </div>
          </div>

          <div class="tag-list" v-if="scene.actions?.length">
            <el-tag
              v-for="(action, index) in scene.actions.slice(0, 3)"
              :key="index"
              size="small"
              :type="getActionTagType(action.type)"
            >
              {{ getActionLabel(action) }}
            </el-tag>
            <el-tag v-if="scene.actions.length > 3" size="small" type="info">
              +{{ scene.actions.length - 3 }}
            </el-tag>
          </div>

          <div class="card-actions card-actions--full">
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
import { MagicStick, VideoPlay } from '@element-plus/icons-vue'
import { useSceneStore } from '@/renderer/stores/scene'
import { useAuthStore } from '@/renderer/stores/auth'
import type { SceneAction, SceneActionType } from '@/renderer/types/scene'
import { ElMessage } from 'element-plus'
import PageHeader from '@/renderer/components/common/PageHeader.vue'
import AuthAlert from '@/renderer/components/common/AuthAlert.vue'
import EmptyState from '@/renderer/components/common/EmptyState.vue'

const router = useRouter()
const sceneStore = useSceneStore()
const authStore = useAuthStore()

const emptyText = computed(() =>
  authStore.isAuthenticated ? '暂无情景数据' : '请先登录云端账号'
)

const handleRefresh = () => {
  if (!authStore.isAuthenticated) {
    ElMessage.warning('请先登录云端账号')
    return
  }
  sceneStore.syncScenes()
}

const navigateToSettings = () => router.push('/settings')

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
@use '@/renderer/styles/common-views.scss';

.card-actions--full {
  .el-button {
    width: 100%;
  }
}
</style>
