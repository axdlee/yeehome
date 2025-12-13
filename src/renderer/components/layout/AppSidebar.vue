<template>
  <el-aside
    :width="sidebarWidth"
    class="app-sidebar"
  >
    <!-- Logo 区域 -->
    <div class="sidebar-header">
      <transition name="fade">
        <h1 v-if="!uiStore.sidebarCollapsed" class="logo-title">
          YeeHome
        </h1>
        <h1 v-else class="logo-title-collapsed">
          YH
        </h1>
      </transition>
    </div>

    <!-- 导航菜单 -->
    <el-menu
      :default-active="activeMenu"
      :collapse="uiStore.sidebarCollapsed"
      :collapse-transition="false"
      class="sidebar-menu"
      router
    >
      <el-menu-item
        v-for="route in menuRoutes"
        :key="route.path"
        :index="route.path"
      >
        <el-icon>
          <component :is="route.meta.icon" />
        </el-icon>
        <template #title>
          {{ route.meta.title }}
        </template>
      </el-menu-item>
    </el-menu>

    <!-- 折叠按钮 -->
    <div class="sidebar-footer">
      <el-button
        :icon="uiStore.sidebarCollapsed ? Expand : Fold"
        circle
        @click="uiStore.toggleSidebar()"
      />
    </div>
  </el-aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Fold, Expand } from '@element-plus/icons-vue'
import { useUIStore } from '@/renderer/stores/ui'
import router from '@/renderer/router'

const uiStore = useUIStore()
const route = useRoute()

// 侧边栏宽度
const sidebarWidth = computed(() =>
  uiStore.sidebarCollapsed ? '64px' : '220px'
)

// 当前激活的菜单项
const activeMenu = computed(() => route.path)

// 过滤出需要显示在菜单中的路由
const menuRoutes = computed(() =>
  router.options.routes.filter(r => r.meta && !r.meta.hidden && r.path !== '/')
)
</script>

<style scoped lang="scss">
.app-sidebar {
  background-color: var(--color-bg-sidebar);
  display: flex;
  flex-direction: column;
  height: 100vh;
  transition: width var(--transition-normal);
  box-shadow: var(--shadow-md);
}

.sidebar-header {
  height: var(--header-height);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 var(--spacing-md);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.logo-title {
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--color-primary);
  margin: 0;
  white-space: nowrap;
}

.logo-title-collapsed {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-primary);
  margin: 0;
}

.sidebar-menu {
  flex: 1;
  border: none;
  background-color: transparent;
  overflow-y: auto;

  :deep(.el-menu-item) {
    color: rgba(255, 255, 255, 0.7);

    &:hover {
      background-color: rgba(255, 255, 255, 0.1);
      color: #ffffff;
    }

    &.is-active {
      background-color: rgba(64, 158, 255, 0.2);
      color: var(--color-primary);
      border-left: 3px solid var(--color-primary);
    }
  }
}

.sidebar-footer {
  padding: var(--spacing-md);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: center;

  .el-button {
    color: rgba(255, 255, 255, 0.7);
    border-color: rgba(255, 255, 255, 0.2);

    &:hover {
      color: #ffffff;
      border-color: var(--color-primary);
      background-color: rgba(64, 158, 255, 0.1);
    }
  }
}
</style>
