<template>
  <el-alert
    :title="alertTitle"
    type="warning"
    show-icon
    :closable="false"
    class="auth-alert"
  >
    <template #default>
      <span>{{ featureName }}需要登录 Yeelight 账号才能访问。</span>
      <el-button type="primary" link @click="$emit('navigate')">
        前往设置登录
      </el-button>
    </template>
  </el-alert>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  featureName: string
}

const props = defineProps<Props>()

defineEmits<{
  (e: 'navigate'): void
}>()

const alertTitle = computed(() => '请先登录云端账号')
</script>

<style scoped lang="scss">
.auth-alert {
  flex-shrink: 0;

  :deep(.el-alert__content) {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }
}
</style>
