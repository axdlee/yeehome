<template>
  <div class="page-header">
    <div class="header-left">
      <h1 class="page-title">{{ title }}</h1>
      <div class="header-stats" v-if="showStats">
        <el-tag type="info" effect="plain">
          共 {{ count }} {{ countLabel }}
        </el-tag>
        <slot name="extra-stats" />
      </div>
    </div>
    <div class="header-right">
      <slot name="actions">
        <el-button
          type="primary"
          :icon="Refresh"
          :loading="loading"
          @click="$emit('refresh')"
        >
          {{ buttonText }}
        </el-button>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Refresh } from '@element-plus/icons-vue'

interface Props {
  title: string
  count?: number
  countLabel?: string
  buttonText?: string
  loading?: boolean
  showStats?: boolean
}

withDefaults(defineProps<Props>(), {
  count: 0,
  countLabel: '个',
  buttonText: '刷新',
  loading: false,
  showStats: true
})

defineEmits<{
  (e: 'refresh'): void
}>()
</script>

<style scoped lang="scss">
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-md);
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.page-title {
  margin: 0;
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--color-text-primary);
}

.header-stats {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}
</style>
