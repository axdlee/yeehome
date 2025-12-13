<template>
  <div class="color-picker-control">
    <div class="picker-header">
      <span class="picker-label">
        <el-icon><Brush /></el-icon>
        颜色
      </span>
      <span class="picker-value">{{ displayColor }}</span>
    </div>
    <div class="picker-content">
      <el-color-picker
        :model-value="hexColor"
        :disabled="disabled"
        :predefine="predefineColors"
        @change="handleChange"
      />
      <div class="color-preview" :style="{ backgroundColor: hexColor }"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Brush } from '@element-plus/icons-vue'

interface Props {
  modelValue: number  // RGB 整数值
  disabled?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: number): void
  (e: 'change', value: number): void
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false
})

const emit = defineEmits<Emits>()

// 预定义颜色
const predefineColors = [
  '#ff4500', '#ff8c00', '#ffd700',
  '#90ee90', '#00ced1', '#1e90ff',
  '#c71585', '#ff69b4', '#ffffff'
]

// RGB 整数转 HEX
const hexColor = computed(() => {
  const r = (props.modelValue >> 16) & 0xff
  const g = (props.modelValue >> 8) & 0xff
  const b = props.modelValue & 0xff
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
})

// 显示颜色值
const displayColor = computed(() => hexColor.value.toUpperCase())

// HEX 转 RGB 整数
const hexToRgb = (hex: string): number => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return 0
  const r = parseInt(result[1], 16)
  const g = parseInt(result[2], 16)
  const b = parseInt(result[3], 16)
  return (r << 16) | (g << 8) | b
}

const handleChange = (value: string | null) => {
  if (value) {
    const rgb = hexToRgb(value)
    emit('update:modelValue', rgb)
    emit('change', rgb)
  }
}
</script>

<style scoped lang="scss">
.color-picker-control {
  width: 100%;

  .picker-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-sm);
  }

  .picker-label {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    color: var(--color-text-regular);
    font-size: var(--font-size-sm);

    .el-icon {
      color: var(--color-danger);
    }
  }

  .picker-value {
    color: var(--color-text-primary);
    font-weight: 500;
    font-size: var(--font-size-sm);
    font-family: monospace;
  }

  .picker-content {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
  }

  .color-preview {
    flex: 1;
    height: 32px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-border);
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
  }
}
</style>
