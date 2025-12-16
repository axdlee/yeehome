<template>
  <el-empty :description="description">
    <template #image v-if="$slots.image">
      <slot name="image" />
    </template>
    <el-button
      v-if="showButton"
      type="primary"
      @click="$emit('action')"
    >
      {{ buttonText }}
    </el-button>
  </el-empty>
</template>

<script setup lang="ts">
interface Props {
  description: string
  buttonText?: string
  showButton?: boolean
}

withDefaults(defineProps<Props>(), {
  buttonText: '刷新',
  showButton: true
})

defineEmits<{
  (e: 'action'): void
}>()
</script>
