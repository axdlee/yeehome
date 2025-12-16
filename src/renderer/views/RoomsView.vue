<template>
  <div class="page-view">
    <!-- 页面头部 -->
    <PageHeader
      title="房间管理"
      :count="roomStore.roomCount"
      count-label="个房间"
      button-text="同步房间"
      :loading="roomStore.isLoading"
      @refresh="handleRefresh"
    />

    <!-- 登录提示 -->
    <AuthAlert
      v-if="!authStore.isAuthenticated"
      feature-name="房间管理"
      @navigate="navigateToSettings"
    />

    <!-- 房间列表 -->
    <div class="page-content" v-loading="roomStore.isLoading">
      <!-- 空状态 -->
      <EmptyState
        v-if="roomStore.rooms.length === 0 && !roomStore.isLoading"
        :description="emptyText"
        button-text="刷新房间"
        :show-button="authStore.isAuthenticated"
        @action="handleRefresh"
      />

      <!-- 房间网格 -->
      <div class="card-grid" v-else>
        <el-card
          v-for="room in roomStore.rooms"
          :key="room.id"
          class="hover-card"
          shadow="hover"
        >
          <div class="card-header">
            <div class="icon-box icon-box--primary icon-box--large">
              <el-icon :size="32"><HomeFilled /></el-icon>
            </div>
            <div class="card-info">
              <h3 class="card-title">{{ room.name }}</h3>
              <span class="card-subtitle">{{ room.deviceIds?.length || 0 }} 个设备</span>
            </div>
          </div>

          <div class="tag-list" v-if="room.deviceIds?.length">
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

          <div class="card-actions">
            <el-button type="primary" size="small" plain @click="handleAllOn(room)">
              全部开启
            </el-button>
            <el-button size="small" plain @click="handleAllOff(room)">
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
import { HomeFilled } from '@element-plus/icons-vue'
import { useRoomStore } from '@/renderer/stores/room'
import { useAuthStore } from '@/renderer/stores/auth'
import { useDeviceStore } from '@/renderer/stores/device'
import type { Room } from '@/renderer/types/room'
import { ElMessage } from 'element-plus'
import PageHeader from '@/renderer/components/common/PageHeader.vue'
import AuthAlert from '@/renderer/components/common/AuthAlert.vue'
import EmptyState from '@/renderer/components/common/EmptyState.vue'

const router = useRouter()
const roomStore = useRoomStore()
const authStore = useAuthStore()
const deviceStore = useDeviceStore()

// 设备名称缓存
const deviceNameMap = computed(() =>
  new Map(deviceStore.devices.map(d => [d.id, d.name || '未知设备']))
)

const emptyText = computed(() => {
  if (!authStore.isAuthenticated) return '请先登录云端账号'
  return '暂无房间数据'
})

const handleRefresh = () => {
  if (!authStore.isAuthenticated) {
    ElMessage.warning('请先登录云端账号')
    return
  }
  roomStore.syncRooms()
}

const navigateToSettings = () => router.push('/settings')

const getDeviceName = (deviceId: string): string =>
  deviceNameMap.value.get(deviceId) || '未知设备'

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
@use '@/renderer/styles/common-views.scss';
</style>
