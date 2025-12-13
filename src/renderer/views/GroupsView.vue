<template>
  <div class="groups-view">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">灯组管理</h1>
        <el-tag type="info" effect="plain">
          共 {{ groupStore.groupCount }} 个灯组
        </el-tag>
      </div>
      <div class="header-right">
        <el-button
          type="primary"
          :icon="Refresh"
          :loading="groupStore.isLoading"
          @click="handleRefresh"
        >
          同步灯组
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
        <span>灯组管理需要登录 Yeelight 账号才能访问。</span>
        <el-button type="primary" link @click="navigateToSettings">
          前往设置登录
        </el-button>
      </template>
    </el-alert>

    <!-- 灯组列表 -->
    <div class="groups-content" v-loading="groupStore.isLoading">
      <!-- 空状态 -->
      <el-empty
        v-if="groupStore.groups.length === 0 && !groupStore.isLoading"
        :description="emptyText"
      >
        <el-button
          v-if="authStore.isAuthenticated"
          type="primary"
          @click="handleRefresh"
        >
          刷新灯组
        </el-button>
      </el-empty>

      <!-- 灯组网格 -->
      <div class="groups-grid" v-else>
        <el-card
          v-for="group in groupStore.groups"
          :key="group.id"
          class="group-card"
          shadow="hover"
        >
          <div class="group-header">
            <div class="group-icon">
              <el-icon :size="28">
                <Grid />
              </el-icon>
            </div>
            <div class="group-info">
              <h3 class="group-name">{{ group.name }}</h3>
              <span class="device-count">{{ group.deviceIds?.length || 0 }} 个设备</span>
            </div>
          </div>

          <div class="group-devices" v-if="group.deviceIds?.length">
            <div class="device-list">
              <el-tag
                v-for="deviceId in group.deviceIds.slice(0, 4)"
                :key="deviceId"
                size="small"
                type="info"
              >
                {{ getDeviceName(deviceId) }}
              </el-tag>
              <el-tag
                v-if="group.deviceIds.length > 4"
                size="small"
                type="info"
              >
                +{{ group.deviceIds.length - 4 }}
              </el-tag>
            </div>
          </div>

          <div class="group-actions">
            <el-button
              type="success"
              size="small"
              :icon="Open"
              @click="handlePower(group.id, true)"
            >
              开启
            </el-button>
            <el-button
              type="danger"
              size="small"
              :icon="TurnOff"
              plain
              @click="handlePower(group.id, false)"
            >
              关闭
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
import { Refresh, Grid, Open, TurnOff } from '@element-plus/icons-vue'
import { useGroupStore } from '@/renderer/stores/group'
import { useAuthStore } from '@/renderer/stores/auth'
import { useDeviceStore } from '@/renderer/stores/device'
import { ElMessage } from 'element-plus'

const router = useRouter()
const groupStore = useGroupStore()
const authStore = useAuthStore()
const deviceStore = useDeviceStore()

// 计算属性
const emptyText = computed(() => {
  if (!authStore.isAuthenticated) {
    return '请先登录云端账号'
  }
  return '暂无灯组数据'
})

// 方法
const handleRefresh = () => {
  if (!authStore.isAuthenticated) {
    ElMessage.warning('请先登录云端账号')
    return
  }
  groupStore.syncGroups()
}

const navigateToSettings = () => {
  router.push('/settings')
}

const getDeviceName = (deviceId: string): string => {
  const device = deviceStore.getDeviceById(deviceId)
  return device?.name || '未知设备'
}

const handlePower = async (groupId: string, power: boolean) => {
  await groupStore.toggleGroupPower(groupId, power)
}

// 生命周期
onMounted(() => {
  groupStore.setupEventListeners()
  if (authStore.isAuthenticated && groupStore.groups.length === 0) {
    groupStore.syncGroups()
  }
})

onUnmounted(() => {
  groupStore.cleanupEventListeners()
})
</script>

<style scoped lang="scss">
.groups-view {
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

.groups-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.groups-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--spacing-lg);
}

.group-card {
  transition: all var(--transition-normal);

  &:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg);
  }

  :deep(.el-card__body) {
    padding: var(--spacing-md);
  }
}

.group-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.group-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--color-warning-light), var(--color-warning));
  border-radius: var(--radius-lg);
  color: #ffffff;
}

.group-info {
  flex: 1;
}

.group-name {
  margin: 0 0 var(--spacing-xs);
  font-size: var(--font-size-md);
  font-weight: 600;
  color: var(--color-text-primary);
}

.device-count {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.group-devices {
  margin-bottom: var(--spacing-md);
}

.device-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}

.group-actions {
  display: flex;
  gap: var(--spacing-sm);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--color-border-light);
}
</style>
