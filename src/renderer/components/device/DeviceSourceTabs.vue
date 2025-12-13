<template>
  <div class="device-source-tabs">
    <el-radio-group
      :model-value="modelValue"
      size="large"
      @change="handleChange"
    >
      <el-radio-button value="local">
        <el-icon><Monitor /></el-icon>
        <span>本地设备</span>
      </el-radio-button>
      <el-radio-button value="cloud">
        <el-icon><Cloudy /></el-icon>
        <span>云端设备</span>
        <el-tag
          v-if="!isAuthenticated"
          type="warning"
          size="small"
          class="auth-tag"
        >
          未登录
        </el-tag>
      </el-radio-button>
    </el-radio-group>
  </div>
</template>

<script setup lang="ts">
import { Monitor, Cloudy } from '@element-plus/icons-vue'
import type { DeviceSource } from '@/renderer/types/device'

interface Props {
  modelValue: DeviceSource
  isAuthenticated?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: DeviceSource): void
  (e: 'change', value: DeviceSource): void
}

const props = withDefaults(defineProps<Props>(), {
  isAuthenticated: false
})

const emit = defineEmits<Emits>()

const handleChange = (value: DeviceSource) => {
  emit('update:modelValue', value)
  emit('change', value)
}
</script>

<style scoped lang="scss">
.device-source-tabs {
  :deep(.el-radio-group) {
    .el-radio-button__inner {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      padding: var(--spacing-sm) var(--spacing-lg);

      .el-icon {
        font-size: 16px;
      }
    }
  }

  .auth-tag {
    margin-left: var(--spacing-xs);
  }
}
</style>
