<template>
  <div class="rooms-view">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">房间管理</h1>
        <el-tag type="info" effect="plain">
          共 {{ roomStore.roomCount }} 个房间
        </el-tag>
      </div>
      <div class="header-right">
        <el-button
          type="primary"
          :icon="Refresh"
          :loading="roomStore.isLoading"
          @click="handleRefresh"
        >
          同步房间
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
        <span>房间管理需要登录 Yeelight 账号才能访问。</span>
        <el-button type="primary" link @click="navigateToSettings">
          前往设置登录
        </el-button>
      </template>
    </el-alert>

    <!-- 房间列表 -->
    <div class="rooms-content" v-loading="roomStore.isLoading">
      <!-- 空状态 -->
      <el-empty
        v-if="roomStore.rooms.length === 0 && !roomStore.isLoading"
        :description="emptyText"
      >
        <el-button
          v-if="authStore.isAuthenticated"
          type="primary"
          @click="handleRefresh"
        >
          刷新房间
        </el-button>
      </el-empty>

      <!-- 房间网格 -->
      <div class="rooms-grid" v-else>
        <el-card
          v-for="room in roomStore.rooms"
          :key="room.id"
          class="room-card"
          shadow="hover"
        >
          <div class="room-header">
            <div class="room-icon">
              <el-icon :size="32">
                <HomeFilled />
              </el-icon>
            </div>
            <div class="room-info">
              <h3 class="room-name">{{ room.name }}</h3>
              <span class="device-count">{{ room.deviceIds?.length || 0 }} 个设备</span>
            </div>
          </div>

          <div class="room-devices" v-if="room.deviceIds?.length">
            <div class="device-list">
              <el-tag
                v-for="deviceId in room.deviceIds.slice(0, 3)"
                :key="deviceId"
                size="small"
                type="info"
              >
                {{ getDeviceName(deviceId) }}
              </el-tag>
              <el-tag
                v-if="room.deviceIds.length > 3"
                size="small"
                type="info"
              >
                +{{ room.deviceIds.length - 3 }}
              </el-tag>
            </div>
          </div>

          <div class="room-actions">
            <el-button
              type="primary"
              size="small"
              plain
              @click="handleAllOn(room)"
            >
              全部开启
            </el-button>
            <el-button
              size="small"
              plain
              @click="handleAllOff(room)"
            >
              全部关闭
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
import { Refresh, HomeFilled } from '@element-plus/icons-vue'
import { useRoomStore } from '@/renderer/stores/room'
import { useAuthStore } from '@/renderer/stores/auth'
import { useDeviceStore } from '@/renderer/stores/device'
import type { Room } from '@/renderer/types/room'
import { ElMessage } from 'element-plus'

const router = useRouter()
const roomStore = useRoomStore()
const authStore = useAuthStore()
const deviceStore = useDeviceStore()

// 计算属性
const emptyText = computed(() => {
  if (!authStore.isAuthenticated) {
    return '请先登录云端账号'
  }
  return '暂无房间数据'
})

// 方法
const handleRefresh = () => {
  if (!authStore.isAuthenticated) {
    ElMessage.warning('请先登录云端账号')
    return
  }
  roomStore.syncRooms()
}

const navigateToSettings = () => {
  router.push('/settings')
}

const getDeviceName = (deviceId: string): string => {
  const device = deviceStore.getDeviceById(deviceId)
  return device?.name || '未知设备'
}

const handleAllOn = async (room: Room) => {
  if (!room.deviceIds?.length) return

  for (const deviceId of room.deviceIds) {
    await deviceStore.togglePower(deviceId, true)
  }
  ElMessage.success(`${room.name} 设备已全部开启`)
}

const handleAllOff = async (room: Room) => {
  if (!room.deviceIds?.length) return

  for (const deviceId of room.deviceIds) {
    await deviceStore.togglePower(deviceId, false)
  }
  ElMessage.success(`${room.name} 设备已全部关闭`)
}

// 生命周期
onMounted(() => {
  roomStore.setupEventListeners()
  if (authStore.isAuthenticated && roomStore.rooms.length === 0) {
    roomStore.syncRooms()
  }
})

onUnmounted(() => {
  roomStore.cleanupEventListeners()
})
</script>

<style scoped lang="scss">
.rooms-view {
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

.rooms-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.rooms-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--spacing-lg);
}

.room-card {
  cursor: pointer;
  transition: all var(--transition-normal);

  &:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg);
  }

  :deep(.el-card__body) {
    padding: var(--spacing-md);
  }
}

.room-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.room-icon {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--color-primary-light), var(--color-primary));
  border-radius: var(--radius-lg);
  color: #ffffff;
}

.room-info {
  flex: 1;
}

.room-name {
  margin: 0 0 var(--spacing-xs);
  font-size: var(--font-size-md);
  font-weight: 600;
  color: var(--color-text-primary);
}

.device-count {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.room-devices {
  margin-bottom: var(--spacing-md);
}

.device-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}

.room-actions {
  display: flex;
  gap: var(--spacing-sm);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--color-border-light);
}
</style>
