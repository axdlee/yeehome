<template>
  <div class="page-view">
    <!-- 页面头部 -->
    <PageHeader
      title="自动化管理"
      :count="automationStore.automationCount"
      count-label="个"
      button-text="同步自动化"
      :loading="automationStore.isLoading"
      @refresh="handleRefresh"
    >
      <template #extra-stats>
        <el-tag type="success" effect="plain">
          启用 {{ automationStore.enabledAutomations.length }} 个
        </el-tag>
      </template>
    </PageHeader>

    <!-- 登录提示 -->
    <AuthAlert
      v-if="!authStore.isAuthenticated"
      feature-name="自动化管理"
      @navigate="navigateToSettings"
    />

    <!-- 自动化列表 -->
    <div class="page-content" v-loading="automationStore.isLoading">
      <EmptyState
        v-if="automationStore.automations.length === 0 && !automationStore.isLoading"
        :description="emptyText"
        button-text="刷新自动化"
        :show-button="authStore.isAuthenticated"
        @action="handleRefresh"
      />

      <!-- 自动化列表 -->
      <div class="automation-list" v-else>
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
                <el-icon :size="24"><Timer /></el-icon>
              </div>
              <div class="automation-info">
                <h3 class="automation-name">{{ automation.name }}</h3>
                <div class="automation-meta">
                  <el-tag :type="getTriggerTagType(automation.triggerType)" size="small" effect="plain">
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
            <div class="tag-list">
              <el-tag
                v-for="(action, index) in automation.actions.slice(0, 3)"
                :key="index"
                size="small"
                type="info"
              >
                {{ getActionLabel(action) }}
              </el-tag>
              <el-tag v-if="automation.actions.length > 3" size="small" type="info">
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
import { Timer } from '@element-plus/icons-vue'
import { useAutomationStore } from '@/renderer/stores/automation'
import { useAuthStore } from '@/renderer/stores/auth'
import type { AutomationTriggerType, AutomationAction } from '@/renderer/types/automation'
import { ElMessage } from 'element-plus'
import PageHeader from '@/renderer/components/common/PageHeader.vue'
import AuthAlert from '@/renderer/components/common/AuthAlert.vue'
import EmptyState from '@/renderer/components/common/EmptyState.vue'

const router = useRouter()
const automationStore = useAutomationStore()
const authStore = useAuthStore()

const emptyText = computed(() =>
  authStore.isAuthenticated ? '暂无自动化规则' : '请先登录云端账号'
)

const handleRefresh = () => {
  if (!authStore.isAuthenticated) {
    ElMessage.warning('请先登录云端账号')
    return
  }
  automationStore.syncAutomations()
}

const navigateToSettings = () => router.push('/settings')

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
  if (action.type === 'power') return action.value ? '开启设备' : '关闭设备'
  if (action.type === 'brightness') return `亮度 ${action.value}%`
  if (action.type === 'color_temp') return `色温 ${action.value}K`
  if (action.type === 'scene') return '执行情景'
  return action.type
}

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
@use '@/renderer/styles/common-views.scss';

.automation-list {
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
</style>
