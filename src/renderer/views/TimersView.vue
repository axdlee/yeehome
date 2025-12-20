<template>
  <div class="timers-view">
    <!-- 页面头部 -->
    <PageHeader
      title="定时任务"
      description="管理和创建定时设备控制任务"
    >
      <template #actions>
        <el-button
          type="primary"
          :icon="Plus"
          @click="showCreateDialog = true"
        >
          创建定时任务
        </el-button>
      </template>
    </PageHeader>

    <!-- 统计卡片 -->
    <div class="timer-stats">
      <el-card class="stat-card" shadow="hover">
        <div class="stat-content">
          <el-icon class="stat-icon total"><Clock /></el-icon>
          <div class="stat-info">
            <div class="stat-value">{{ timerStore.stats.total }}</div>
            <div class="stat-label">全部</div>
          </div>
        </div>
      </el-card>

      <el-card class="stat-card" shadow="hover">
        <div class="stat-content">
          <el-icon class="stat-icon active"><CircleCheck /></el-icon>
          <div class="stat-info">
            <div class="stat-value">{{ timerStore.stats.active }}</div>
            <div class="stat-label">已启用</div>
          </div>
        </div>
      </el-card>

      <el-card class="stat-card" shadow="hover">
        <div class="stat-content">
          <el-icon class="stat-icon paused"><VideoPause /></el-icon>
          <div class="stat-info">
            <div class="stat-value">{{ timerStore.stats.paused }}</div>
            <div class="stat-label">已暂停</div>
          </div>
        </div>
      </el-card>

      <el-card class="stat-card" shadow="hover">
        <div class="stat-content">
          <el-icon class="stat-icon expired"><Clock /></el-icon>
          <div class="stat-info">
            <div class="stat-value">{{ timerStore.stats.expired }}</div>
            <div class="stat-label">已过期</div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 定时任务列表 -->
    <el-card class="timer-list-card" shadow="never">
      <template #header>
        <div class="list-header">
          <span>定时任务列表</span>
          <el-input
            v-model="searchKeyword"
            placeholder="搜索定时任务..."
            :prefix-icon="Search"
            clearable
            style="width: 240px"
          />
        </div>
      </template>

      <el-table
        v-loading="timerStore.isLoading"
        :data="filteredTimers"
        style="width: 100%"
        stripe
      >
        <el-table-column prop="name" label="名称" min-width="150">
          <template #default="{ row }">
            <div class="timer-name">
              <span>{{ row.name }}</span>
              <el-tag
                v-if="row.description"
                size="small"
                type="info"
                class="name-tag"
              >
                {{ row.description }}
              </el-tag>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="触发时间" min-width="150">
          <template #default="{ row }">
            <div class="trigger-info">
              <el-tag :type="getTriggerTagType(row.trigger.type)" size="small">
                {{ getTriggerLabel(row.trigger) }}
              </el-tag>
              <span v-if="row.nextTriggerAt" class="next-time">
                {{ formatNextTrigger(row.nextTriggerAt) }}
              </span>
              <span v-else class="no-trigger">无计划</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="执行动作" min-width="150">
          <template #default="{ row }">
            <div class="action-info">
              <el-icon><ArrowRight /></el-icon>
              <span>{{ formatAction(row.action) }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="status" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="触发次数" width="100" align="center">
          <template #default="{ row }">
            <span>{{ row.triggerCount }}</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="200" align="center">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button
                v-if="row.status === 'paused'"
                type="success"
                size="small"
                :icon="VideoPlay"
                circle
                @click="handleEnable(row.id)"
              />
              <el-button
                v-else-if="row.status === 'active'"
                type="warning"
                size="small"
                :icon="VideoPause"
                circle
                @click="handleDisable(row.id)"
              />
              <el-button
                type="primary"
                size="small"
                :icon="Refresh"
                circle
                @click="handleTrigger(row.id)"
              />
              <el-button
                type="info"
                size="small"
                :icon="Edit"
                circle
                @click="handleEdit(row)"
              />
              <el-button
                type="danger"
                size="small"
                :icon="Delete"
                circle
                @click="handleDelete(row.id)"
              />
            </div>
          </template>
        </el-table-column>
      </el-table>

      <el-empty
        v-if="!timerStore.isLoading && filteredTimers.length === 0"
        description="暂无定时任务"
      >
        <el-button type="primary" @click="showCreateDialog = true">
          创建第一个定时任务
        </el-button>
      </el-empty>
    </el-card>

    <!-- 创建/编辑对话框 -->
    <TimerForm
      v-model:visible="showCreateDialog"
      :timer="editingTimer"
      @success="onFormSuccess"
      @close="onFormClose"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessageBox } from 'element-plus'
import {
  Plus, Search, Clock, CircleCheck, VideoPause, VideoPlay,
  Refresh, Edit, Delete, ArrowRight
} from '@element-plus/icons-vue'
import PageHeader from '@/renderer/components/common/PageHeader.vue'
import TimerForm from '@/renderer/components/timer/TimerForm.vue'
import { useTimerStore } from '@/renderer/stores/timer'
import type { Timer, TimerTrigger } from '@/renderer/types/timer'

const timerStore = useTimerStore()

// 搜索关键词
const searchKeyword = ref('')

// 对话框状态
const showCreateDialog = ref(false)
const editingTimer = ref<Timer | null>(null)

// 过滤后的定时任务列表
const filteredTimers = computed(() => {
  if (!searchKeyword.value) {
    return timerStore.timers
  }
  const keyword = searchKeyword.value.toLowerCase()
  return timerStore.timers.filter(t =>
    t.name.toLowerCase().includes(keyword) ||
    t.description?.toLowerCase().includes(keyword)
  )
})

// 获取触发类型标签样式
function getTriggerTagType(type: TimerTrigger['type']): 'success' | 'primary' | 'warning' | 'danger' | 'info' {
  const typeMap: Record<TimerTrigger['type'], 'success' | 'primary' | 'warning' | 'danger' | 'info'> = {
    once: 'success',
    recurring: 'primary',
    sunrise: 'warning',
    sunset: 'danger'
  }
  return typeMap[type] || 'info'
}

// 获取触发类型标签文本
function getTriggerLabel(trigger: TimerTrigger): string {
  const labelMap: Record<string, string> = {
    once: '一次性',
    recurring: '重复',
    sunrise: '日出',
    sunset: '日落'
  }
  return labelMap[trigger.type] || trigger.type
}

// 格式化下次触发时间
function formatNextTrigger(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = date.getTime() - now.getTime()

  if (diff < 0) {
    return '已过期'
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (days > 0) {
    return `${days}天${hours}小时后`
  }
  if (hours > 0) {
    return `${hours}小时${minutes}分钟后`
  }
  return `${minutes}分钟后`
}

// 格式化执行动作
function formatAction(action: Timer['action']): string {
  const typeMap: Record<string, string> = {
    on: '开启',
    off: '关闭',
    toggle: '切换',
    brightness: '调节亮度',
    color: '设置颜色',
    scene: '执行情景',
    ct: '调节色温'
  }

  let result = typeMap[action.type] || action.type
  if (action.params) {
    if (action.params.brightness) {
      result += ` ${action.params.brightness}%`
    }
    if (action.params.colorTemp) {
      result += ` ${action.params.colorTemp}K`
    }
  }
  return result
}

// 获取状态标签类型
function getStatusType(status: Timer['status']): '' | 'success' | 'warning' | 'info' | 'danger' {
  const typeMap: Record<Timer['status'], '' | 'success' | 'warning' | 'info' | 'danger'> = {
    active: 'success',
    paused: 'warning',
    expired: 'info',
    completed: ''
  }
  return typeMap[status] || 'info'
}

// 获取状态标签文本
function getStatusLabel(status: string): string {
  const labelMap: Record<string, string> = {
    active: '已启用',
    paused: '已暂停',
    expired: '已过期',
    completed: '已完成'
  }
  return labelMap[status] || status
}

// 启用定时任务
async function handleEnable(timerId: string) {
  const result = await timerStore.updateTimer(timerId, { status: 'active' })
  if (result) {
    // 重新计算下次触发时间
    const timer = timerStore.getTimerById(timerId)
    if (timer) {
      timerStore.updateTimer(timerId, {
        nextTriggerAt: calculateNextTrigger(timer.trigger)
      })
    }
  }
}

// 禁用定时任务
async function handleDisable(timerId: string) {
  await timerStore.updateTimer(timerId, {
    status: 'paused',
    nextTriggerAt: null
  })
}

// 手动触发定时任务
async function handleTrigger(timerId: string) {
  await timerStore.triggerTimer(timerId)
}

// 编辑定时任务
function handleEdit(timer: Timer) {
  editingTimer.value = timer
  showCreateDialog.value = true
}

// 删除定时任务
async function handleDelete(timerId: string) {
  try {
    await ElMessageBox.confirm(
      '确定要删除这个定时任务吗？此操作不可恢复。',
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    await timerStore.deleteTimer(timerId)
  } catch {
    // 用户取消
  }
}

// 计算下次触发时间
function calculateNextTrigger(trigger: TimerTrigger): string | null {
  const now = new Date()

  if (trigger.type === 'once') {
    if (!trigger.date || !trigger.time) return null
    const next = new Date(`${trigger.date}T${trigger.time}`)
    if (next.getTime() <= now.getTime()) return null
    return next.toISOString()
  }

  if (trigger.type === 'recurring') {
    // 简化处理：返回明天相同时间
    const [hours, minutes] = (trigger.time || '00:00').split(':').map(Number)
    const next = new Date()
    next.setHours(hours, minutes, 0, 0)
    if (next.getTime() <= now.getTime()) {
      next.setDate(next.getDate() + 1)
    }
    return next.toISOString()
  }

  // sunrise/sunset 简化处理
  return null
}

// 表单成功回调
function onFormSuccess() {
  editingTimer.value = null
  timerStore.loadTimers()
}

// 表单关闭回调
function onFormClose() {
  editingTimer.value = null
}

// 设置事件监听
function setupEventListeners() {
  timerStore.setupEventListeners()
}

// 清理事件监听
function cleanupEventListeners() {
  timerStore.cleanupEventListeners()
}

onMounted(() => {
  timerStore.loadTimers()
  setupEventListeners()
})

onUnmounted(() => {
  cleanupEventListeners()
})
</script>

<style scoped lang="scss">
.timers-view {
  padding: var(--spacing-lg);
}

.timer-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.stat-card {
  border: none;
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);

  :deep(.el-card__body) {
    padding: var(--spacing-md);
  }
}

.stat-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.stat-icon {
  font-size: 32px;

  &.total { color: var(--color-primary); }
  &.active { color: var(--color-success); }
  &.paused { color: var(--color-warning); }
  &.expired { color: var(--color-info); }
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--color-text-primary);
}

.stat-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.timer-list-card {
  border: none;
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.timer-name {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);

  .name-tag {
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.trigger-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);

  .next-time {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  .no-trigger {
    font-size: var(--font-size-sm);
    color: var(--color-text-placeholder);
  }
}

.action-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: var(--spacing-xs);
}
</style>
