<template>
  <div class="devices-view">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">设备管理</h1>
        <div class="device-stats">
          <el-tag type="info" effect="plain">
            共 {{ deviceStore.totalDeviceCount }} 台
          </el-tag>
          <el-tag type="success" effect="plain">
            在线 {{ deviceStore.onlineDeviceCount }} 台
          </el-tag>
          <el-tag type="warning" effect="plain">
            开启 {{ deviceStore.powerOnDeviceCount }} 台
          </el-tag>
        </div>
      </div>
      <div class="header-right">
        <el-button
          type="primary"
          :icon="Refresh"
          :loading="deviceStore.isDiscovering"
          @click="handleRefresh"
        >
          {{ deviceStore.deviceSource === 'local' ? '发现设备' : '同步设备' }}
        </el-button>
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="main-content">
      <!-- 左侧：设备列表 -->
      <div class="device-section">
        <!-- 操作栏 -->
        <div class="action-bar">
          <!-- 设备源切换 -->
          <DeviceSourceTabs
            v-model="currentSource"
            :is-authenticated="authStore.isAuthenticated"
            @change="handleSourceChange"
          />

          <!-- 搜索和筛选 -->
          <div class="filter-area">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索设备名称、型号..."
              :prefix-icon="Search"
              clearable
              class="search-input"
              @input="handleSearch"
            />
            <el-select
              v-model="filterType"
              placeholder="设备类型"
              clearable
              class="type-filter"
              @change="handleFilterChange"
            >
              <el-option label="单色灯" value="mono" />
              <el-option label="彩色灯" value="color" />
              <el-option label="灯带" value="stripe" />
              <el-option label="吸顶灯" value="ceiling" />
              <el-option label="床头灯" value="bslamp" />
            </el-select>
            <el-select
              v-model="filterPower"
              placeholder="电源状态"
              clearable
              class="power-filter"
              @change="handleFilterChange"
            >
              <el-option label="已开启" value="on" />
              <el-option label="已关闭" value="off" />
            </el-select>
          </div>
        </div>

        <!-- 云端未登录提示 -->
        <el-alert
          v-if="currentSource === 'cloud' && !authStore.isAuthenticated"
          title="请先登录云端账号"
          type="warning"
          show-icon
          :closable="false"
          class="auth-alert"
        >
          <template #default>
            <span>云端设备需要登录 Yeelight 账号才能访问。</span>
            <el-button type="primary" link @click="navigateToSettings">
              前往设置登录
            </el-button>
          </template>
        </el-alert>

        <!-- 设备网格 -->
        <div class="device-content" v-loading="deviceStore.isDiscovering">
          <DeviceGrid
            :devices="deviceStore.filteredDevices"
            :empty-text="emptyText"
            :show-refresh-button="!deviceStore.isDiscovering"
            @device-click="handleDeviceClick"
            @power-change="handlePowerChange"
            @refresh="handleRefresh"
          />
        </div>

        <!-- 最后同步时间 -->
        <div class="sync-info" v-if="deviceStore.lastSyncTime">
          <el-icon><Clock /></el-icon>
          <span>最后同步: {{ formatLastSyncTime }}</span>
        </div>
      </div>

      <!-- 右侧：AI智能推荐 -->
      <div class="ai-section">
        <AIRecommendationPanel />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Refresh, Search, Clock } from '@element-plus/icons-vue'
import { useDeviceStore } from '@/renderer/stores/device'
import { useAuthStore } from '@/renderer/stores/auth'
import type { Device, DeviceSource, PowerState } from '@/renderer/types/device'
import DeviceSourceTabs from '@/renderer/components/device/DeviceSourceTabs.vue'
import DeviceGrid from '@/renderer/components/device/DeviceGrid.vue'
import AIRecommendationPanel from '@/renderer/components/ai/AIRecommendationPanel.vue'

const router = useRouter()
const deviceStore = useDeviceStore()
const authStore = useAuthStore()

// 本地状态
const currentSource = ref<DeviceSource>(deviceStore.deviceSource)
const searchKeyword = ref('')
const filterType = ref<string>('')
const filterPower = ref<PowerState | ''>('')

// 计算属性
const emptyText = computed(() => {
  if (currentSource.value === 'cloud' && !authStore.isAuthenticated) {
    return '请先登录云端账号'
  }
  if (deviceStore.isDiscovering) {
    return '正在搜索设备...'
  }
  if (searchKeyword.value || filterType.value || filterPower.value) {
    return '没有找到匹配的设备'
  }
  return currentSource.value === 'local'
    ? '未发现本地设备，请确保设备已开启并在同一网络'
    : '暂无云端设备'
})

const formatLastSyncTime = computed(() => {
  if (!deviceStore.lastSyncTime) return ''
  return deviceStore.lastSyncTime.toLocaleString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
})

// 方法
const handleRefresh = () => {
  deviceStore.discoverDevices()
}

const handleSourceChange = async (source: DeviceSource) => {
  // 如果切换到云端但未登录，不执行同步
  if (source === 'cloud' && !authStore.isAuthenticated) {
    currentSource.value = source
    deviceStore.deviceSource = source
    return
  }
  await deviceStore.setDeviceSource(source)
}

const handleSearch = () => {
  updateFilter()
}

const handleFilterChange = () => {
  updateFilter()
}

const updateFilter = () => {
  deviceStore.setFilter({
    keyword: searchKeyword.value || undefined,
    type: filterType.value || undefined,
    power: filterPower.value || undefined
  })
}

const handleDeviceClick = (device: Device) => {
  deviceStore.selectDevice(device)
  router.push(`/devices/${device.id}`)
}

const handlePowerChange = async (deviceId: string, power: boolean) => {
  await deviceStore.togglePower(deviceId, power)
}

const navigateToSettings = () => {
  router.push('/settings')
}

// 同步 store 中的 deviceSource 到本地状态
watch(() => deviceStore.deviceSource, (newSource) => {
  currentSource.value = newSource
})

// 监听认证状态变化,登录成功后自动同步云端设备
watch(() => authStore.isAuthenticated, (isAuth, wasAuth) => {
  // 只在认证状态从 false 变为 true 时触发,且当前是云端标签
  if (isAuth && !wasAuth && currentSource.value === 'cloud') {
    console.log('[DevicesView] 检测到登录成功,准备同步云端设备')
    // 延迟500ms,等待后端自动同步完成
    setTimeout(() => {
      if (!deviceStore.isDiscovering) {
        console.log('[DevicesView] 自动同步云端设备')
        deviceStore.discoverDevices()
      } else {
        console.log('[DevicesView] 设备正在同步中,跳过')
      }
    }, 500)
  }
})

// 生命周期
onMounted(() => {
  deviceStore.setupEventListeners()
  // 初始加载设备
  // 如果是云端标签且未登录,不自动加载
  if (currentSource.value === 'cloud' && !authStore.isAuthenticated) {
    console.log('[DevicesView] 云端标签但未登录,跳过自动加载')
    return
  }
  // 如果设备列表为空,才自动加载
  if (deviceStore.devices.length === 0) {
    deviceStore.discoverDevices()
  }
})

onUnmounted(() => {
  deviceStore.cleanupEventListeners()
})
</script>

<style scoped lang="scss">
.devices-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: var(--spacing-lg);
  gap: var(--spacing-lg);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: var(--spacing-md);
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.page-title {
  margin: 0;
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--color-text-primary);
}

.device-stats {
  display: flex;
  gap: var(--spacing-sm);

  .el-tag {
    font-size: var(--font-size-sm);
  }
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

// 主内容区域 - 左右布局
.main-content {
  display: flex;
  gap: var(--spacing-lg);
  flex: 1;
  min-height: 0;
}

.device-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.ai-section {
  width: 360px;
  flex-shrink: 0;
}

.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background-color: var(--color-bg-light);
  border-radius: var(--radius-lg);
}

.filter-area {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.search-input {
  width: 240px;
}

.type-filter,
.power-filter {
  width: 120px;
}

.auth-alert {
  flex-shrink: 0;

  :deep(.el-alert__content) {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }
}

.device-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  margin-top: var(--spacing-md);
}

.sync-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

// 响应式布局
@media (max-width: 1200px) {
  .main-content {
    flex-direction: column;
  }

  .ai-section {
    width: 100%;
    flex-shrink: 0;
  }
}

@media (max-width: 768px) {
  .action-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-area {
    justify-content: center;
  }

  .search-input {
    width: 100%;
  }

  .type-filter,
  .power-filter {
    flex: 1;
    min-width: 100px;
  }
}
</style>
