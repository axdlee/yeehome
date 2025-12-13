<template>
  <div class="brightness-slider">
    <div class="slider-header">
      <span class="slider-label">
        <el-icon><Sunny /></el-icon>
        亮度
      </span>
      <span class="slider-value">{{ modelValue }}%</span>
    </div>
    <el-slider
      :model-value="modelValue"
      :min="1"
      :max="100"
      :disabled="disabled"
      :show-tooltip="false"
      @input="handleInput"
      @change="handleChange"
    />
  </div>
</template>

<script setup lang="ts">
import { Sunny } from '@element-plus/icons-vue'

interface Props {
  modelValue: number
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

// 实时更新显示值（拖动时）
const handleInput = (value: number) => {
  emit('update:modelValue', value)
}

// 松开时触发实际控制
const handleChange = (value: number) => {
  emit('change', value)
}
</script>

<style scoped lang="scss">
.brightness-slider {
  width: 100%;

  .slider-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-sm);
  }

  .slider-label {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    color: var(--color-text-regular);
    font-size: var(--font-size-sm);

    .el-icon {
      color: var(--color-warning);
    }
  }

  .slider-value {
    color: var(--color-text-primary);
    font-weight: 500;
    font-size: var(--font-size-sm);
  }

  :deep(.el-slider) {
    --el-slider-main-bg-color: var(--color-warning);
    --el-slider-runway-bg-color: var(--color-border-light);
    --el-slider-button-size: 18px;

    .el-slider__runway {
      height: 6px;
      border-radius: 3px;
    }

    .el-slider__bar {
      height: 6px;
      border-radius: 3px;
    }

    .el-slider__button-wrapper {
      .el-slider__button {
        border: 2px solid var(--color-warning);
        box-shadow: var(--shadow-sm);
      }
    }
  }
}
</style>
