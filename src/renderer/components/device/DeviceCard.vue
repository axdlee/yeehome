<template>
  <el-card
    class="device-card"
    :class="cardClass"
    shadow="hover"
    @click="handleClick"
  >
    <!-- 卡片头部：状态指示器 + 名称 + 电源开关 -->
    <div class="device-card__header">
      <div class="device-info">
        <span class="status-indicator" :class="statusClass"></span>
        <span class="device-name">{{ device.name || '未命名设备' }}</span>
      </div>
      <PowerSwitch
        :model-value="isPowerOn"
        :loading="isPowerChanging"
        @change="handlePowerToggle"
        @click.stop
      />
    </div>

    <!-- 卡片主体：设备型号 + 功能标签 -->
    <div class="device-card__body">
      <div class="device-model">
        <el-icon><Cpu /></el-icon>
        <span>{{ modelLabel }}</span>
      </div>
      <DeviceFeatureTags
        v-if="device.support?.length"
        :support="device.support"
      />
    </div>

    <!-- 卡片底部：状态信息 -->
    <div class="device-card__footer" v-if="isPowerOn">
      <div class="stat-item" v-if="device.bright">
        <el-icon><Sunny /></el-icon>
        <span>{{ device.bright }}%</span>
      </div>
      <div class="stat-item" v-if="device.ct">
        <el-icon><Moon /></el-icon>
        <span>{{ device.ct }}K</span>
      </div>
      <div class="stat-item color-stat" v-if="device.rgb && device.color_mode === 1">
        <span class="color-dot" :style="{ backgroundColor: rgbColor }"></span>
        <span>{{ rgbColor }}</span>
      </div>
    </div>

    <!-- 离线遮罩 -->
    <div class="offline-overlay" v-if="!device.connected">
      <el-icon><WarnTriangleFilled /></el-icon>
      <span>设备离线</span>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Cpu, Sunny, Moon, WarnTriangleFilled } from '@element-plus/icons-vue'
import type { Device } from '@/renderer/types/device'
import PowerSwitch from './controls/PowerSwitch.vue'
import DeviceFeatureTags from './DeviceFeatureTags.vue'

interface Props {
  device: Device
}

interface Emits {
  (e: 'click', device: Device): void
  (e: 'power-change', deviceId: string, power: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 电源切换加载状态
const isPowerChanging = ref(false)

// 是否开启
const isPowerOn = computed(() => props.device.power === 'on')

// 卡片样式类
const cardClass = computed(() => ({
  'device-card--on': isPowerOn.value,
  'device-card--offline': !props.device.connected
}))

// 状态指示器样式类
const statusClass = computed(() => ({
  'status--on': isPowerOn.value && props.device.connected,
  'status--off': !isPowerOn.value && props.device.connected,
  'status--offline': !props.device.connected
}))

// 设备型号标签
const modelLabel = computed(() => {
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
  return modelMap[props.device.model] || props.device.model
})

// RGB 颜色值
const rgbColor = computed(() => {
  if (!props.device.rgb) return '#ffffff'
  const r = (props.device.rgb >> 16) & 0xff
  const g = (props.device.rgb >> 8) & 0xff
  const b = props.device.rgb & 0xff
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
})

// 点击卡片
const handleClick = () => {
  emit('click', props.device)
}

// 切换电源
const handlePowerToggle = async (power: boolean) => {
  isPowerChanging.value = true
  emit('power-change', props.device.id, power)
  // 延迟后重置状态（由父组件更新）
  setTimeout(() => {
    isPowerChanging.value = false
  }, 1000)
}
</script>

<style scoped lang="scss">
.device-card {
  position: relative;
  cursor: pointer;
  border-radius: var(--radius-lg);
  transition: all var(--transition-normal);
  overflow: hidden;

  &:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg);
  }

  // 开启状态
  &--on {
    border-left: 3px solid var(--color-success);
  }

  // 离线状态
  &--offline {
    opacity: 0.7;

    &:hover {
      transform: none;
    }
  }

  :deep(.el-card__body) {
    padding: var(--spacing-md);
  }
}

.device-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
}

.device-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.status-indicator {
  width: 10px;
  height: 10px;
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

.device-name {
  font-size: var(--font-size-md);
  font-weight: 600;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 150px;
}

.device-card__body {
  margin-bottom: var(--spacing-md);
}

.device-model {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  margin-bottom: var(--spacing-sm);

  .el-icon {
    color: var(--color-primary);
  }
}

.device-card__footer {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding-top: var(--spacing-sm);
  border-top: 1px solid var(--color-border-light);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
  color: var(--color-text-regular);

  .el-icon {
    font-size: 14px;
  }

  &.color-stat {
    .color-dot {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 1px solid var(--color-border);
    }

    span:last-child {
      font-family: monospace;
      text-transform: uppercase;
    }
  }
}

.offline-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  gap: var(--spacing-sm);

  .el-icon {
    font-size: 32px;
    color: var(--color-warning);
  }

  span {
    font-size: var(--font-size-sm);
  }
}
</style>
