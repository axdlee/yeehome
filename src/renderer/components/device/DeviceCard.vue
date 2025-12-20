<template>
  <div
    class="device-card"
    :class="cardClass"
    @click="handleClick"
  >
    <!-- 渐变边框效果 -->
    <div class="card-border-gradient"></div>

    <!-- 卡片内容 -->
    <div class="card-content">
      <!-- 卡片头部：状态指示器 + 名称 + 电源开关 -->
      <div class="device-card__header">
        <div class="device-info">
          <span class="status-indicator" :class="statusClass">
            <span class="status-ring"></span>
          </span>
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
          <div class="stat-icon brightness">
            <el-icon><Sunny /></el-icon>
          </div>
          <div class="stat-bar">
            <div class="stat-bar-fill" :style="{ width: `${device.bright}%` }"></div>
          </div>
          <span class="stat-value">{{ device.bright }}%</span>
        </div>
        <div class="stat-item" v-if="device.ct">
          <div class="stat-icon ct">
            <el-icon><Moon /></el-icon>
          </div>
          <span class="stat-label">色温</span>
          <span class="stat-value">{{ device.ct }}K</span>
        </div>
        <div class="stat-item color-stat" v-if="device.rgb && device.color_mode === 1">
          <div class="stat-icon color">
            <span class="color-preview" :style="{ backgroundColor: rgbColor }"></span>
          </div>
          <span class="stat-label">颜色</span>
          <span class="stat-value color-name">{{ rgbColor }}</span>
        </div>
      </div>

      <!-- 开启时的光晕效果 -->
      <div v-if="isPowerOn" class="device-glow"></div>
    </div>

    <!-- 离线遮罩 -->
    <div class="offline-overlay" v-if="!device.connected">
      <div class="offline-content">
        <el-icon class="offline-icon"><WarnTriangleFilled /></el-icon>
        <span>设备离线</span>
      </div>
    </div>
  </div>
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
  transition: all var(--transition-spring);
  overflow: hidden;
  background: var(--color-bg-card);

  // 渐变边框
  .card-border-gradient {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 2px;
    background: var(--gradient-primary);
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    opacity: 0;
    transition: opacity var(--transition-normal);
    pointer-events: none;
  }

  .card-content {
    position: relative;
    z-index: 1;
    padding: var(--spacing-md);
    height: 100%;
  }

  &:hover {
    transform: translateY(-6px);
    box-shadow: var(--shadow-xl);

    .card-border-gradient {
      opacity: 0.6;
    }
  }

  // 开启状态
  &--on {
    .card-border-gradient {
      opacity: 0.8;
    }

    .device-glow {
      opacity: 0.15;
    }
  }

  // 离线状态
  &--offline {
    opacity: 0.8;

    &:hover {
      transform: none;

      .card-border-gradient {
        opacity: 0;
      }
    }
  }

  :deep(.el-card__body) {
    padding: 0;
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
  position: relative;
  width: 12px;
  height: 12px;
  display: flex;
  align-items: center;
  justify-content: center;

  .status-ring {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    transition: all var(--transition-normal);
  }

  &.status--on {
    .status-ring {
      background-color: var(--device-on);
      box-shadow: 0 0 12px var(--device-on);
      animation: status-pulse 2s ease-in-out infinite;
    }
  }

  &.status--off {
    .status-ring {
      background-color: var(--device-off);
    }
  }

  &.status--offline {
    .status-ring {
      background-color: var(--device-offline);
      box-shadow: 0 0 8px var(--device-offline);
    }
  }
}

@keyframes status-pulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 8px var(--device-on);
  }
  50% {
    transform: scale(1.2);
    box-shadow: 0 0 16px var(--device-on), 0 0 24px var(--device-on);
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
  flex-direction: column;
  gap: var(--spacing-sm);
  padding-top: var(--spacing-sm);
  border-top: 1px solid var(--color-border-light);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--font-size-sm);
}

.stat-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  flex-shrink: 0;

  &.brightness {
    background: rgba(245, 158, 11, 0.1);
    color: var(--device-brightness);
  }

  &.ct {
    background: rgba(59, 130, 246, 0.1);
    color: var(--device-ct);
  }

  &.color {
    background: rgba(236, 72, 153, 0.1);

    .color-preview {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 2px solid var(--color-bg-card);
    }
  }

  .el-icon {
    font-size: 12px;
  }
}

.stat-label {
  color: var(--color-text-secondary);
  flex: 1;
}

.stat-value {
  font-weight: 500;
  color: var(--color-text-primary);
  min-width: 45px;
  text-align: right;

  &.color-name {
    font-family: 'SF Mono', 'Monaco', monospace;
    font-size: var(--font-size-xs);
    text-transform: uppercase;
  }
}

.stat-bar {
  flex: 1;
  height: 4px;
  background: var(--color-border-light);
  border-radius: var(--radius-full);
  overflow: hidden;

  .stat-bar-fill {
    height: 100%;
    background: var(--gradient-warning);
    border-radius: var(--radius-full);
    transition: width var(--transition-normal);
  }
}

// 设备光晕效果
.device-glow {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60%;
  background: var(--gradient-primary);
  filter: blur(40px);
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--transition-normal);
}

.offline-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  border-radius: var(--radius-lg);

  .offline-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-sm);
    color: #ffffff;

    .offline-icon {
      font-size: 32px;
      color: var(--device-offline);
      animation: offline-pulse 2s ease-in-out infinite;
    }

    span {
      font-size: var(--font-size-sm);
      font-weight: 500;
    }
  }
}

@keyframes offline-pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
