<template>
  <div class="page-view">
    <!-- 页面头部 -->
    <PageHeader
      title="灯组管理"
      :count="groupStore.groupCount"
      count-label="个灯组"
      button-text="同步灯组"
      :loading="groupStore.isLoading"
      @refresh="handleRefresh"
    />

    <!-- 登录提示 -->
    <AuthAlert
      v-if="!authStore.isAuthenticated"
      feature-name="灯组管理"
      @navigate="navigateToSettings"
    />

    <!-- 灯组列表 -->
    <div class="page-content" v-loading="groupStore.isLoading">
      <EmptyState
        v-if="groupStore.groups.length === 0 && !groupStore.isLoading"
        :description="emptyText"
        button-text="刷新灯组"
        :show-button="authStore.isAuthenticated"
        @action="handleRefresh"
      />

      <!-- 灯组网格 -->
      <div class="card-grid" v-else>
        <el-card
          v-for="group in groupStore.groups"
          :key="group.id"
          class="hover-card"
          shadow="hover"
        >
          <div class="card-header">
            <div class="icon-box icon-box--warning">
              <el-icon :size="28"><Grid /></el-icon>
            </div>
            <div class="card-info">
              <h3 class="card-title">{{ group.name }}</h3>
              <span class="card-subtitle">{{ group.deviceIds?.length || 0 }} 个设备</span>
            </div>
          </div>

          <div class="tag-list" v-if="group.deviceIds?.length">
            <el-tag
              v-for="deviceId in group.deviceIds.slice(0, 4)"
              :key="deviceId"
              size="small"
              type="info"
            >
              {{ getDeviceName(deviceId) }}
            </el-tag>
            <el-tag v-if="group.deviceIds.length > 4" size="small" type="info">
              +{{ group.deviceIds.length - 4 }}
            </el-tag>
          </div>

          <div class="card-actions">
            <el-button type="success" size="small" :icon="Open" @click="handlePower(group.id, true)">
              开启
            </el-button>
            <el-button type="danger" size="small" :icon="TurnOff" plain @click="handlePower(group.id, false)">
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
import { Grid, Open, TurnOff } from '@element-plus/icons-vue'
import { useGroupStore } from '@/renderer/stores/group'
import { useAuthStore } from '@/renderer/stores/auth'
import { useDeviceStore } from '@/renderer/stores/device'
import { ElMessage } from 'element-plus'
import PageHeader from '@/renderer/components/common/PageHeader.vue'
import AuthAlert from '@/renderer/components/common/AuthAlert.vue'
import EmptyState from '@/renderer/components/common/EmptyState.vue'

const router = useRouter()
const groupStore = useGroupStore()
const authStore = useAuthStore()
const deviceStore = useDeviceStore()

// 设备名称缓存
const deviceNameMap = computed(() =>
  new Map(deviceStore.devices.map(d => [d.id, d.name || '未知设备']))
)

const emptyText = computed(() =>
  authStore.isAuthenticated ? '暂无灯组数据' : '请先登录云端账号'
)

const handleRefresh = () => {
  if (!authStore.isAuthenticated) {
    ElMessage.warning('请先登录云端账号')
    return
  }
  groupStore.syncGroups()
}

const navigateToSettings = () => router.push('/settings')

const getDeviceName = (deviceId: string): string =>
  deviceNameMap.value.get(deviceId) || '未知设备'

const handlePower = async (groupId: string, power: boolean) => {
  await groupStore.toggleGroupPower(groupId, power)
}

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
@use '@/renderer/styles/common-views.scss';
</style>
