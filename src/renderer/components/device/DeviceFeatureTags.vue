<template>
  <div class="device-feature-tags">
    <el-tag
      v-for="feature in displayFeatures"
      :key="feature.name"
      :type="feature.type"
      size="small"
      effect="plain"
    >
      {{ feature.label }}
    </el-tag>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  support: string[]  // 支持的方法列表
}

interface FeatureInfo {
  name: string
  label: string
  type: 'primary' | 'success' | 'warning' | 'info' | 'danger'
}

const props = defineProps<Props>()

// 功能映射
const featureMap: Record<string, FeatureInfo> = {
  set_bright: { name: 'brightness', label: '亮度', type: 'warning' },
  set_ct_abx: { name: 'color_temp', label: '色温', type: 'info' },
  set_rgb: { name: 'rgb', label: 'RGB', type: 'danger' },
  set_hsv: { name: 'hsv', label: 'HSV', type: 'danger' },
  set_scene: { name: 'scene', label: '情景', type: 'success' },
  start_cf: { name: 'flow', label: '流光', type: 'primary' },
  set_music: { name: 'music', label: '音乐', type: 'primary' },
  cron_add: { name: 'timer', label: '定时', type: 'info' },
  bg_set_rgb: { name: 'bg_rgb', label: '背景灯', type: 'success' }
}

// 计算显示的功能标签
const displayFeatures = computed(() => {
  const features: FeatureInfo[] = []
  const addedFeatures = new Set<string>()

  props.support.forEach(method => {
    const feature = featureMap[method]
    if (feature && !addedFeatures.has(feature.name)) {
      features.push(feature)
      addedFeatures.add(feature.name)
    }
  })

  return features.slice(0, 5)  // 最多显示5个
})
</script>

<style scoped lang="scss">
.device-feature-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);

  .el-tag {
    border-radius: var(--radius-sm);
    font-size: 11px;
    padding: 0 6px;
    height: 20px;
    line-height: 18px;
  }
}
</style>
