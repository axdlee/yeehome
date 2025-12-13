<template>
  <div class="color-temp-slider">
    <div class="slider-header">
      <span class="slider-label">
        <el-icon><Moon /></el-icon>
        色温
      </span>
      <span class="slider-value">{{ modelValue }}K</span>
    </div>
    <div class="slider-wrapper">
      <span class="temp-label warm">暖</span>
      <el-slider
        :model-value="modelValue"
        :min="1700"
        :max="6500"
        :step="100"
        :disabled="disabled"
        :show-tooltip="false"
        @input="handleInput"
        @change="handleChange"
      />
      <span class="temp-label cool">冷</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Moon } from '@element-plus/icons-vue'

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

const handleInput = (value: number) => {
  emit('update:modelValue', value)
}

const handleChange = (value: number) => {
  emit('change', value)
}
</script>

<style scoped lang="scss">
.color-temp-slider {
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
      color: var(--color-primary);
    }
  }

  .slider-value {
    color: var(--color-text-primary);
    font-weight: 500;
    font-size: var(--font-size-sm);
  }

  .slider-wrapper {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .temp-label {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    white-space: nowrap;

    &.warm {
      color: #ff9800;
    }

    &.cool {
      color: #2196f3;
    }
  }

  :deep(.el-slider) {
    flex: 1;

    .el-slider__runway {
      height: 6px;
      border-radius: 3px;
      background: linear-gradient(to right, #ff9800, #fff5e6, #e3f2fd, #2196f3);
    }

    .el-slider__bar {
      display: none;
    }

    .el-slider__button-wrapper {
      .el-slider__button {
        width: 18px;
        height: 18px;
        border: 2px solid var(--color-primary);
        box-shadow: var(--shadow-sm);
      }
    }
  }
}
</style>
