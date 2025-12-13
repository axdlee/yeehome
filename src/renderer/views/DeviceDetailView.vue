<template>
  <div class="device-detail-view" v-loading="isLoading">
    <!-- 返回按钮和标题 -->
    <div class="page-header">
      <el-button :icon="ArrowLeft" @click="handleBack" text>
        返回设备列表
      </el-button>
      <div class="header-actions" v-if="device">
        <el-tag :type="device.connected ? 'success' : 'danger'" effect="plain">
          {{ device.connected ? '在线' : '离线' }}
        </el-tag>
        <el-tag type="info" effect="plain">
          {{ device.source === 'local' ? '本地' : '云端' }}
        </el-tag>
      </div>
    </div>

    <!-- 设备未找到 -->
    <div class="not-found" v-if="!device && !isLoading">
      <el-empty description="设备未找到">
        <el-button type="primary" @click="handleBack">返回设备列表</el-button>
      </el-empty>
    </div>

    <!-- 设备详情内容 -->
    <div class="device-content" v-else-if="device">
      <!-- 设备信息卡片 -->
      <el-card class="info-card">
        <template #header>
          <div class="card-header">
            <div class="device-title">
              <span class="status-dot" :class="statusClass"></span>
              <h2>{{ device.name || '未命名设备' }}</h2>
            </div>
            <PowerSwitch
              :model-value="isPowerOn"
              :loading="isPowerChanging"
              size="large"
              @change="handlePowerToggle"
            />
          </div>
        </template>

        <div class="device-info-grid">
          <div class="info-item">
            <span class="info-label">设备型号</span>
            <span class="info-value">{{ modelLabel }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">设备ID</span>
            <span class="info-value mono">{{ device.id }}</span>
          </div>
          <div class="info-item" v-if="device.ip">
            <span class="info-label">IP地址</span>
            <span class="info-value mono">{{ device.ip }}</span>
          </div>
          <div class="info-item" v-if="device.fw_ver">
            <span class="info-label">固件版本</span>
            <span class="info-value">{{ device.fw_ver }}</span>
          </div>
        </div>

        <!-- 支持功能标签 -->
        <div class="features-section" v-if="device.support?.length">
          <span class="section-label">支持功能</span>
          <DeviceFeatureTags :support="device.support" />
        </div>
      </el-card>

      <!-- 控制面板 -->
      <el-card class="control-card" v-if="device.connected">
        <template #header>
          <div class="card-header">
            <h3>控制面板</h3>
            <el-tag v-if="!isPowerOn" type="info" size="small">
              设备已关闭
            </el-tag>
          </div>
        </template>

        <div class="control-panel" :class="{ 'is-disabled': !isPowerOn }">
          <!-- 亮度控制 -->
          <div class="control-section" v-if="supportsBrightness">
            <BrightnessSlider
              v-model="brightness"
              :disabled="!isPowerOn"
              @change="handleBrightnessChange"
            />
          </div>

          <!-- 色温控制 -->
          <div class="control-section" v-if="supportsColorTemp">
            <ColorTempSlider
              v-model="colorTemp"
              :disabled="!isPowerOn"
              @change="handleColorTempChange"
            />
          </div>

          <!-- 颜色控制 -->
          <div class="control-section" v-if="supportsColor">
            <ColorPicker
              v-model="rgbColor"
              :disabled="!isPowerOn"
              @change="handleColorChange"
            />
          </div>

          <!-- 颜色模式切换 -->
          <div class="control-section" v-if="supportsColorTemp && supportsColor">
            <div class="mode-switch">
              <span class="section-label">颜色模式</span>
              <el-radio-group
                v-model="colorMode"
                :disabled="!isPowerOn"
                @change="handleColorModeChange"
              >
                <el-radio-button :value="2">色温模式</el-radio-button>
                <el-radio-button :value="1">RGB模式</el-radio-button>
              </el-radio-group>
            </div>
          </div>

          <!-- 快捷预设 -->
          <div class="control-section" v-if="isPowerOn">
            <div class="presets-section">
              <span class="section-label">快捷预设</span>
              <div class="presets-grid">
                <el-button
                  v-for="preset in presets"
                  :key="preset.name"
                  :type="preset.type"
                  plain
                  @click="applyPreset(preset)"
                >
                  <el-icon v-if="preset.icon"><component :is="preset.icon" /></el-icon>
                  {{ preset.name }}
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </el-card>

      <!-- 离线提示 -->
      <el-card class="offline-card" v-else>
        <el-result
          icon="warning"
          title="设备离线"
          sub-title="无法控制离线设备，请检查设备电源和网络连接"
        >
          <template #extra>
            <el-button type="primary" @click="handleRefresh">刷新状态</el-button>
          </template>
        </el-result>
      </el-card>

      <!-- 设备日志/历史 -->
      <el-card class="log-card">
        <template #header>
          <div class="card-header">
            <h3>设备信息</h3>
          </div>
        </template>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="电源状态">
            <el-tag :type="isPowerOn ? 'success' : 'info'" size="small">
              {{ isPowerOn ? '开启' : '关闭' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="当前亮度" v-if="device.bright">
            {{ device.bright }}%
          </el-descriptions-item>
          <el-descriptions-item label="当前色温" v-if="device.ct">
            {{ device.ct }}K
          </el-descriptions-item>
          <el-descriptions-item label="当前颜色" v-if="device.rgb">
            <span class="color-display">
              <span class="color-swatch" :style="{ backgroundColor: currentHexColor }"></span>
              {{ currentHexColor }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="颜色模式" v-if="device.color_mode">
            {{ colorModeLabel }}
          </el-descriptions-item>
          <el-descriptions-item label="数据来源">
            {{ device.source === 'local' ? '本地局域网' : '云端服务器' }}
          </el-descriptions-item>
        </el-descriptions>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, markRaw, type Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft,
  Sunny,
  Moon,
  MagicStick,
  Reading,
  Film
} from '@element-plus/icons-vue'
import { useDeviceStore } from '@/renderer/stores/device'
import type { Device } from '@/renderer/types/device'
import PowerSwitch from '@/renderer/components/device/controls/PowerSwitch.vue'
import BrightnessSlider from '@/renderer/components/device/controls/BrightnessSlider.vue'
import ColorTempSlider from '@/renderer/components/device/controls/ColorTempSlider.vue'
import ColorPicker from '@/renderer/components/device/controls/ColorPicker.vue'
import DeviceFeatureTags from '@/renderer/components/device/DeviceFeatureTags.vue'

interface Preset {
  name: string
  type: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  icon?: Component
  brightness?: number
  ct?: number
  rgb?: number
}

const route = useRoute()
const router = useRouter()
const deviceStore = useDeviceStore()

// 状态
const isLoading = ref(false)
const isPowerChanging = ref(false)
const brightness = ref(100)
const colorTemp = ref(4000)
const rgbColor = ref(16777215) // 白色
const colorMode = ref(2) // 2: 色温模式, 1: RGB模式

// 计算属性
const device = computed((): Device | null => {
  const id = route.params.id as string
  return deviceStore.getDeviceById(id) || deviceStore.selectedDevice
})

const isPowerOn = computed(() => device.value?.power === 'on')

const statusClass = computed(() => ({
  'status--on': isPowerOn.value && device.value?.connected,
  'status--off': !isPowerOn.value && device.value?.connected,
  'status--offline': !device.value?.connected
}))

const modelLabel = computed(() => {
  if (!device.value) return ''
  const modelMap: Record<string, string> = {
    mono: '单色灯',
    color: '彩色灯',
    stripe: '灯带',
    ceiling: '吸顶灯',
    ceiling1: '吸顶灯',
    ceiling4: '吸顶灯Pro',
    bslamp: '床头灯',
    ct_bulb: '色温灯'
  }
  return modelMap[device.value.model] || device.value.model
})

const colorModeLabel = computed(() => {
  switch (device.value?.color_mode) {
    case 1: return 'RGB 彩色模式'
    case 2: return '色温模式'
    case 3: return 'HSV 模式'
    default: return '未知'
  }
})

const currentHexColor = computed(() => {
  if (!device.value?.rgb) return '#FFFFFF'
  const r = (device.value.rgb >> 16) & 0xff
  const g = (device.value.rgb >> 8) & 0xff
  const b = device.value.rgb & 0xff
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase()
})

// 功能支持检测
const supportsBrightness = computed(() =>
  device.value?.support?.includes('set_bright')
)

const supportsColorTemp = computed(() =>
  device.value?.support?.includes('set_ct_abx')
)

const supportsColor = computed(() =>
  device.value?.support?.includes('set_rgb') || device.value?.support?.includes('set_hsv')
)

// 预设
const presets = computed<Preset[]>(() => [
  { name: '日光', type: 'warning', icon: markRaw(Sunny), brightness: 100, ct: 5000 },
  { name: '暖光', type: 'warning', icon: markRaw(Moon), brightness: 80, ct: 2700 },
  { name: '阅读', type: 'primary', icon: markRaw(Reading), brightness: 100, ct: 4500 },
  { name: '电影', type: 'info', icon: markRaw(Film), brightness: 30, ct: 3000 },
  { name: '夜灯', type: 'success', icon: markRaw(MagicStick), brightness: 5, ct: 2700 }
])

// 方法
const handleBack = () => {
  router.push('/devices')
}

const handleRefresh = async () => {
  isLoading.value = true
  await deviceStore.refreshDevices()
  isLoading.value = false
}

const handlePowerToggle = async (power: boolean) => {
  if (!device.value) return
  isPowerChanging.value = true
  await deviceStore.togglePower(device.value.id, power)
  isPowerChanging.value = false
}

const handleBrightnessChange = async (value: number) => {
  if (!device.value) return
  await deviceStore.setBrightness(device.value.id, value)
}

const handleColorTempChange = async (value: number) => {
  if (!device.value) return
  await deviceStore.setColorTemperature(device.value.id, value)
}

const handleColorChange = async (value: number) => {
  if (!device.value) return
  await deviceStore.setColor(device.value.id, value)
}

const handleColorModeChange = (mode: number) => {
  // 切换颜色模式时自动应用
  if (mode === 2 && device.value) {
    handleColorTempChange(colorTemp.value)
  } else if (mode === 1 && device.value) {
    handleColorChange(rgbColor.value)
  }
}

const applyPreset = async (preset: Preset) => {
  if (!device.value) return

  if (preset.brightness !== undefined) {
    brightness.value = preset.brightness
    await deviceStore.setBrightness(device.value.id, preset.brightness)
  }

  if (preset.ct !== undefined) {
    colorTemp.value = preset.ct
    await deviceStore.setColorTemperature(device.value.id, preset.ct)
  }

  if (preset.rgb !== undefined) {
    rgbColor.value = preset.rgb
    await deviceStore.setColor(device.value.id, preset.rgb)
  }
}

// 同步设备状态到本地
const syncDeviceState = () => {
  if (device.value) {
    brightness.value = device.value.bright || 100
    colorTemp.value = device.value.ct || 4000
    rgbColor.value = device.value.rgb || 16777215
    colorMode.value = device.value.color_mode || 2
  }
}

// 监听设备变化
watch(device, syncDeviceState, { immediate: true })

// 生命周期
onMounted(() => {
  deviceStore.setupEventListeners()
  // 如果没有选中设备，尝试从列表获取
  if (!device.value && deviceStore.devices.length === 0) {
    handleRefresh()
  }
})

onUnmounted(() => {
  deviceStore.cleanupEventListeners()
})
</script>

<style scoped lang="scss">
.device-detail-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: var(--spacing-lg);
  gap: var(--spacing-lg);
  overflow-y: auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.not-found {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.device-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

// 信息卡片
.info-card {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .device-title {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);

    h2 {
      margin: 0;
      font-size: var(--font-size-lg);
      font-weight: 600;
    }
  }

  .status-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    flex-shrink: 0;

    &.status--on {
      background-color: var(--color-success);
      box-shadow: 0 0 8px var(--color-success);
    }

    &.status--off {
      background-color: var(--color-info-light);
    }

    &.status--offline {
      background-color: var(--color-danger);
    }
  }
}

.device-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);

  .info-label {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  .info-value {
    font-size: var(--font-size-md);
    color: var(--color-text-primary);
    font-weight: 500;

    &.mono {
      font-family: monospace;
      font-size: var(--font-size-sm);
    }
  }
}

.features-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--color-border-light);
}

.section-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-xs);
}

// 控制卡片
.control-card {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    h3 {
      margin: 0;
      font-size: var(--font-size-md);
      font-weight: 600;
    }
  }
}

.control-panel {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);

  &.is-disabled {
    opacity: 0.5;
    pointer-events: none;
  }
}

.control-section {
  padding-bottom: var(--spacing-lg);
  border-bottom: 1px solid var(--color-border-light);

  &:last-child {
    padding-bottom: 0;
    border-bottom: none;
  }
}

.mode-switch {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.presets-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.presets-grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);

  .el-button {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
  }
}

// 离线卡片
.offline-card {
  :deep(.el-result) {
    padding: var(--spacing-xl) 0;
  }
}

// 日志卡片
.log-card {
  .card-header {
    h3 {
      margin: 0;
      font-size: var(--font-size-md);
      font-weight: 600;
    }
  }
}

.color-display {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.color-swatch {
  width: 20px;
  height: 20px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
}

// 响应式
@media (max-width: 768px) {
  .device-info-grid {
    grid-template-columns: 1fr;
  }

  .presets-grid {
    .el-button {
      flex: 1;
      min-width: calc(50% - var(--spacing-sm));
    }
  }
}
</style>
