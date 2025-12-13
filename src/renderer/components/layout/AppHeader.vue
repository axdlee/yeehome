<template>
  <el-header class="app-header">
    <!-- 页面标题 -->
    <div class="header-title">
      <h2>{{ pageTitle }}</h2>
    </div>

    <!-- 右侧操作区 -->
    <div class="header-actions">
      <!-- 主题切换 -->
      <el-tooltip :content="isDark ? '切换到亮色模式' : '切换到暗色模式'" placement="bottom">
        <el-button
          :icon="isDark ? Sunny : Moon"
          circle
          @click="uiStore.toggleTheme()"
        />
      </el-tooltip>

      <!-- 设置按钮 -->
      <el-tooltip content="设置" placement="bottom">
        <el-button
          :icon="Setting"
          circle
          @click="goToSettings"
        />
      </el-tooltip>
    </div>
  </el-header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Sunny, Moon, Setting } from '@element-plus/icons-vue'
import { useUIStore } from '@/renderer/stores/ui'

const route = useRoute()
const router = useRouter()
const uiStore = useUIStore()

// 页面标题
const pageTitle = computed(() =>
  (route.meta.title as string) || 'YeeHome'
)

// 是否暗色模式
const isDark = computed(() => uiStore.isDark)

// 前往设置页面
const goToSettings = () => {
  router.push('/settings')
}
</script>

<style scoped lang="scss">
.app-header {
  height: var(--header-height);
  background-color: var(--color-bg-card);
  border-bottom: 1px solid var(--color-border-light);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--spacing-lg);
  box-shadow: var(--shadow-sm);
}

.header-title {
  h2 {
    margin: 0;
    font-size: var(--font-size-xl);
    font-weight: 600;
    color: var(--color-text-primary);
  }
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);

  .el-button {
    transition: all var(--transition-fast);

    &:hover {
      transform: translateY(-2px);
    }
  }
}
</style>
