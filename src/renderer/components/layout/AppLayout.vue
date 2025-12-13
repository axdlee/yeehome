<template>
  <el-container class="app-layout">
    <!-- 侧边栏 -->
    <AppSidebar />

    <!-- 主容器 -->
    <el-container class="main-container">
      <!-- 顶部栏 -->
      <AppHeader />

      <!-- 主内容区 -->
      <el-main class="main-content">
        <slot />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import AppSidebar from './AppSidebar.vue'
import AppHeader from './AppHeader.vue'
import { useUIStore } from '@/renderer/stores/ui'

const uiStore = useUIStore()

// 初始化主题
onMounted(() => {
  uiStore.initTheme()
})
</script>

<style scoped lang="scss">
.app-layout {
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

.main-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.main-content {
  flex: 1;
  overflow-y: auto;
  background-color: var(--color-bg-page);
  padding: var(--spacing-lg);

  // 滚动条样式已在 base.scss 中定义
}
</style>
