<template>
  <div class="automations-view">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">自动化管理</h1>
        <div class="automation-stats">
          <el-tag type="info" effect="plain">
            共 {{ automationStore.automationCount }} 个
          </el-tag>
          <el-tag type="success" effect="plain">
            启用 {{ automationStore.enabledAutomations.length }} 个
          </el-tag>
        </div>
      </div>
      <div class="header-right">
        <el-button
          type="primary"
          :icon="Refresh"
          :loading="automationStore.isLoading"
          @click="handleRefresh"
        >
          同步自动化
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
        <span>自动化管理需要登录 Yeelight 账号才能访问。</span>
        <el-button type="primary" link @click="navigateToSettings">
          前往设置登录
        </el-button>
      </template>
    </el-alert>

    <!-- 自动化列表 -->
    <div class="automations-content" v-loading="automationStore.isLoading">
      <!-- 空状态 -->
      <el-empty
        v-if="automationStore.automations.length === 0 && !automationStore.isLoading"
        :description="emptyText"
      >
        <el-button
          v-if="authStore.isAuthenticated"
          type="primary"
          @click="handleRefresh"
        >
          刷新自动化
        </el-button>
      </el-empty>

      <!-- 自动化列表 -->
      <div class="automations-list" v-else>
        <el-card
          v-for="automation in automationStore.automations"
          :key="automation.id"
          class="automation-card"
          :class="{ 'is-disabled': !automation.enabled }"
          shadow="hover"
        >
          <div class="automation-content">
            <div class="automation-left">
              <div class="automation-icon" :class="{ 'is-active': automation.enabled }">
                <el-icon :size="24">
                  <Timer />
                </el-icon>
              </div>
              <div class="automation-info">
                <h3 class="automation-name">{{ automation.name }}</h3>
                <div class="automation-meta">
                  <el-tag
                    :type="getTriggerTagType(automation.triggerType)"
                    size="small"
                    effect="plain"
                  >
                    {{ getTriggerLabel(automation.triggerType) }}
                  </el-tag>
                  <span class="condition-text" v-if="automation.triggerCondition">
                    {{ automation.triggerCondition }}
                  </span>
                </div>
              </div>
            </div>
            <div class="automation-right">
              <el-switch
                :model-value="automation.enabled"
                active-text="启用"
                inactive-text="禁用"
                @change="handleToggle(automation.id)"
              />
            </div>
          </div>

          <div class="automation-actions" v-if="automation.actions?.length">
            <span class="actions-label">执行动作:</span>
            <div class="actions-list">
              <el-tag
                v-for="(action, index) in automation.actions.slice(0, 3)"
                :key="index"
                size="small"
                type="info"
              >
                {{ getActionLabel(action) }}
              </el-tag>
              <el-tag
                v-if="automation.actions.length > 3"
                size="small"
                type="info"
              >
                +{{ automation.actions.length - 3 }}
              </el-tag>
            </div>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Refresh, Timer } from '@element-plus/icons-vue'
import { useAutomationStore } from '@/renderer/stores/automation'
import { useAuthStore } from '@/renderer/stores/auth'
import type { AutomationTriggerType, AutomationAction } from '@/renderer/types/automation'
import { ElMessage } from 'element-plus'

const router = useRouter()
const automationStore = useAutomationStore()
const authStore = useAuthStore()

// 计算属性
const emptyText = computed(() => {
  if (!authStore.isAuthenticated) {
    return '请先登录云端账号'
  }
  return '暂无自动化规则'
})

// 方法
const handleRefresh = () => {
  if (!authStore.isAuthenticated) {
    ElMessage.warning('请先登录云端账号')
    return
  }
  automationStore.syncAutomations()
}

const navigateToSettings = () => {
  router.push('/settings')
}

const handleToggle = async (automationId: string) => {
  await automationStore.toggleAutomation(automationId)
}

const getTriggerTagType = (type: AutomationTriggerType): 'primary' | 'success' | 'warning' | 'danger' | 'info' => {
  const typeMap: Record<AutomationTriggerType, 'primary' | 'success' | 'warning' | 'danger' | 'info'> = {
    time: 'primary',
    sunrise: 'warning',
    sunset: 'warning',
    device_state: 'success',
    location: 'info'
  }
  return typeMap[type] || 'info'
}

const getTriggerLabel = (type: AutomationTriggerType): string => {
  const labelMap: Record<AutomationTriggerType, string> = {
    time: '定时触发',
    sunrise: '日出触发',
    sunset: '日落触发',
    device_state: '设备状态',
    location: '位置触发'
  }
  return labelMap[type] || type
}

const getActionLabel = (action: AutomationAction): string => {
  if (action.type === 'power') {
    return action.value ? '开启设备' : '关闭设备'
  }
  if (action.type === 'brightness') {
    return `亮度 ${action.value}%`
  }
  if (action.type === 'color_temp') {
    return `色温 ${action.value}K`
  }
  if (action.type === 'scene') {
    return '执行情景'
  }
  return action.type
}

// 生命周期
onMounted(() => {
  automationStore.setupEventListeners()
  if (authStore.isAuthenticated && automationStore.automations.length === 0) {
    automationStore.syncAutomations()
  }
})

onUnmounted(() => {
  automationStore.cleanupEventListeners()
})
</script>

<style scoped lang="scss">
.automations-view {
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

.automation-stats {
  display: flex;
  gap: var(--spacing-sm);
}

.auth-alert {
  flex-shrink: 0;

  :deep(.el-alert__content) {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }
}

.automations-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.automations-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.automation-card {
  transition: all var(--transition-normal);

  &:hover {
    box-shadow: var(--shadow-lg);
  }

  &.is-disabled {
    opacity: 0.6;
  }

  :deep(.el-card__body) {
    padding: var(--spacing-md);
  }
}

.automation-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-md);
}

.automation-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  flex: 1;
}

.automation-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-info-light);
  border-radius: var(--radius-lg);
  color: var(--color-info);

  &.is-active {
    background: linear-gradient(135deg, var(--color-primary-light), var(--color-primary));
    color: #ffffff;
  }
}

.automation-info {
  flex: 1;
}

.automation-name {
  margin: 0 0 var(--spacing-xs);
  font-size: var(--font-size-md);
  font-weight: 600;
  color: var(--color-text-primary);
}

.automation-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.condition-text {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.automation-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--color-border-light);
}

.actions-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.actions-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}
</style>
