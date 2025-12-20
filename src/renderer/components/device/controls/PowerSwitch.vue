<template>
  <div class="power-switch" :class="{ 'power-switch--on': modelValue }">
    <button
      class="switch-button"
      :class="{ 'is-loading': loading, 'is-disabled': disabled }"
      :disabled="disabled || loading"
      @click="handleClick"
    >
      <div class="switch-track">
        <div class="switch-thumb">
          <div v-if="loading" class="switch-spinner">
            <svg viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-dasharray="31.4 31.4"/>
            </svg>
          </div>
          <el-icon v-else-if="modelValue" class="switch-icon on"><CircleCheckFilled /></el-icon>
          <el-icon v-else class="switch-icon off"><CircleCloseFilled /></el-icon>
        </div>
      </div>
      <span class="switch-label">{{ modelValue ? '开' : '关' }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
interface Props {
  modelValue: boolean
  loading?: boolean
  disabled?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'change', value: boolean): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  disabled: false
})

const emit = defineEmits<Emits>()

const handleClick = () => {
  if (!props.disabled && !props.loading) {
    const newValue = !props.modelValue
    emit('update:modelValue', newValue)
    emit('change', newValue)
  }
}
</script>

<style scoped lang="scss">
.power-switch {
  display: inline-flex;
  align-items: center;
}

.switch-button {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: 4px;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all var(--transition-fast);
  border-radius: var(--radius-full);

  &:hover:not(.is-disabled) {
    background: rgba(59, 130, 246, 0.05);
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px var(--color-primary-light-5);
  }

  &.is-disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
}

.switch-track {
  position: relative;
  width: 44px;
  height: 24px;
  background: var(--color-border-light);
  border-radius: var(--radius-full);
  transition: all var(--transition-normal);
}

.switch-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background: #ffffff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all var(--transition-spring);
}

.switch-icon {
  font-size: 14px;
  transition: all var(--transition-fast);

  &.on {
    color: var(--color-success);
  }

  &.off {
    color: var(--color-text-placeholder);
  }
}

.switch-spinner {
  width: 14px;
  height: 14px;

  svg {
    width: 100%;
    height: 100%;
    animation: spin 1s linear infinite;
  }
}

.switch-label {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-text-secondary);
  min-width: 16px;
  transition: all var(--transition-fast);
}

// 开启状态
.power-switch--on {
  .switch-track {
    background: var(--gradient-success);
  }

  .switch-thumb {
    transform: translateX(20px);
    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
  }

  .switch-icon.on {
    color: #ffffff;
  }

  .switch-label {
    color: var(--color-success);
    font-weight: 600;
  }

  .switch-button:hover:not(.is-disabled) {
    background: rgba(16, 185, 129, 0.1);
  }
}

// 禁用状态
.switch-button.is-disabled {
  .switch-track {
    opacity: 0.5;
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
