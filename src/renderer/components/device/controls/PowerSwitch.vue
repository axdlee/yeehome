<template>
  <div class="power-switch" :class="{ 'power-switch--on': modelValue }">
    <el-switch
      :model-value="modelValue"
      :loading="loading"
      :disabled="disabled"
      inline-prompt
      active-text="开"
      inactive-text="关"
      @change="handleChange"
    />
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

const handleChange = (value: boolean) => {
  emit('update:modelValue', value)
  emit('change', value)
}
</script>

<style scoped lang="scss">
.power-switch {
  display: inline-flex;
  align-items: center;

  :deep(.el-switch) {
    --el-switch-on-color: var(--color-success);
    --el-switch-off-color: var(--color-info-light);
  }
}
</style>
