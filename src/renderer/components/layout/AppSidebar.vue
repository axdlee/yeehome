<template>
  <el-aside
    :width="sidebarWidth"
    class="app-sidebar"
  >
    <!-- 背景渐变 -->
    <div class="sidebar-bg"></div>

    <!-- Logo 区域 -->
    <div class="sidebar-header">
      <div class="logo-container">
        <div class="logo-icon">
          <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="14" stroke="url(#logo-gradient)" stroke-width="2"/>
            <path d="M16 8V16L22 22" stroke="url(#logo-gradient)" stroke-width="2" stroke-linecap="round"/>
            <circle cx="16" cy="16" r="4" fill="url(#logo-gradient)"/>
            <defs>
              <linearGradient id="logo-gradient" x1="8" y1="8" x2="24" y2="24">
                <stop stop-color="#3b82f6"/>
                <stop offset="1" stop-color="#8b5cf6"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
        <transition name="fade-slide">
          <h1 v-if="!uiStore.sidebarCollapsed" class="logo-title">
            YeeHome
          </h1>
        </transition>
      </div>
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
        <el-icon class="menu-icon">
          <component :is="getIconComponent(route.meta.icon)" />
        </el-icon>
        <template #title>
          {{ route.meta.title }}
        </template>
        <!-- 激活指示器 -->
        <div class="active-indicator"></div>
      </el-menu-item>
    </el-menu>

    <!-- 底部区域 -->
    <div class="sidebar-footer">
      <!-- 主题切换 -->
      <el-tooltip
        :content="isDark ? '切换到亮色模式' : '切换到暗色模式'"
        placement="right"
        :disabled="!uiStore.sidebarCollapsed"
      >
        <el-button
          :icon="isDark ? Sunny : Moon"
          class="footer-btn"
          @click="uiStore.toggleTheme()"
        >
          <span v-if="!uiStore.sidebarCollapsed" class="btn-text">
            {{ isDark ? '亮色模式' : '暗色模式' }}
          </span>
        </el-button>
      </el-tooltip>

      <!-- 折叠按钮 -->
      <el-tooltip
        :content="uiStore.sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'"
        placement="right"
        :disabled="!uiStore.sidebarCollapsed"
      >
        <el-button
          :icon="uiStore.sidebarCollapsed ? Expand : Fold"
          class="footer-btn collapse-btn"
          @click="uiStore.toggleSidebar()"
        >
          <span v-if="!uiStore.sidebarCollapsed" class="btn-text">
            {{ uiStore.sidebarCollapsed ? '展开' : '收起' }}
          </span>
        </el-button>
      </el-tooltip>
    </div>
  </el-aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  Fold, Expand, Sunny, Moon,
  Cpu, House, MagicStick, Collection, Setting, Clock, Tools
} from '@element-plus/icons-vue'
import { useUIStore } from '@/renderer/stores/ui'
import router from '@/renderer/router'

// 图标名称到组件的映射
const iconMap: Record<string, any> = {
  Cpu,
  House,
  MagicStick,
  Collection,
  Setting,
  Clock,
  Tools
}

// 根据图标名称获取图标组件
const getIconComponent = (iconName: string | undefined) => {
  if (!iconName) return Cpu
  return iconMap[iconName] || Cpu
}

const uiStore = useUIStore()
const route = useRoute()

// 侧边栏宽度
const sidebarWidth = computed(() =>
  uiStore.sidebarCollapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)'
)

// 当前激活的菜单项
const activeMenu = computed(() => route.path)

// 是否暗色模式
const isDark = computed(() => uiStore.isDark)

// 过滤出需要显示在菜单中的路由
const menuRoutes = computed(() =>
  router.options.routes.filter(r => r.meta && !r.meta.hidden && r.path !== '/')
)
</script>

<style scoped lang="scss">
.app-sidebar {
  position: relative;
  background: var(--color-bg-sidebar);
  display: flex;
  flex-direction: column;
  height: 100vh;
  transition: width var(--transition-normal);
  overflow: hidden;

  // 背景渐变
  .sidebar-bg {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse at 0% 0%, rgba(59, 130, 246, 0.08) 0%, transparent 50%),
      radial-gradient(ellipse at 100% 100%, rgba(139, 92, 246, 0.05) 0%, transparent 50%);
    pointer-events: none;
  }
}

.sidebar-header {
  position: relative;
  z-index: 1;
  height: var(--header-height);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 var(--spacing-md);
  border-bottom: 1px solid var(--sidebar-border-color);
}

.logo-container {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.logo-icon {
  width: 36px;
  height: 36px;
  flex-shrink: 0;

  svg {
    width: 100%;
    height: 100%;
  }
}

.logo-title {
  font-size: var(--font-size-xl);
  font-weight: 700;
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  white-space: nowrap;
  letter-spacing: -0.5px;
}

.sidebar-menu {
  position: relative;
  z-index: 1;
  flex: 1;
  border: none;
  background: transparent;
  overflow-y: auto;
  padding: var(--spacing-md) 0;

  :deep(.el-menu-item) {
    position: relative;
    height: 48px;
    line-height: 48px;
    margin: 2px var(--spacing-sm);
    padding: 0 var(--spacing-md) !important;
    border-radius: var(--radius-md);
    color: var(--sidebar-text-color);
    transition: all var(--transition-fast);

    .menu-icon {
      width: 20px;
      height: 20px;
      margin-right: var(--spacing-sm);
      transition: all var(--transition-fast);
    }

    &:hover {
      background: var(--sidebar-bg-hover);
      color: var(--sidebar-text-hover);

      .menu-icon {
        color: var(--color-primary);
        transform: scale(1.1);
      }
    }

    &.is-active {
      background: rgba(59, 130, 246, 0.1);
      color: var(--color-primary);

      .menu-icon {
        color: var(--color-primary);
      }

      // 激活指示器
      .active-indicator {
        position: absolute;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        width: 3px;
        height: 24px;
        background: var(--gradient-primary);
        border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
        box-shadow: var(--glow-primary-sm);
      }
    }
  }
}

.sidebar-footer {
  position: relative;
  z-index: 1;
  padding: var(--spacing-md);
  border-top: 1px solid var(--sidebar-border-color);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);

  .footer-btn {
    width: 100%;
    justify-content: flex-start;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: var(--sidebar-text-color);
    transition: all var(--transition-fast);

    &:hover {
      background: rgba(59, 130, 246, 0.1);
      border-color: var(--color-primary);
      color: var(--sidebar-text-hover);
      transform: translateX(4px);
    }

    .btn-text {
      margin-left: var(--spacing-sm);
      font-size: var(--font-size-sm);
    }
  }

  .collapse-btn {
    justify-content: center;

    &:hover {
      transform: none;
    }
  }
}

// 折叠状态下的样式
.sidebar-menu.el-menu--collapse {
  :deep(.el-menu-item) {
    padding: 0 !important;
    justify-content: center;

    .menu-icon {
      margin-right: 0;
    }

    .active-indicator {
      display: none;
    }
  }
}

.app-sidebar:has(.el-menu--collapse) {
  .sidebar-footer {
    .footer-btn {
      justify-content: center;
      padding: var(--spacing-sm);

      .btn-text {
        display: none;
      }
    }
  }
}

// 过渡动画
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all var(--transition-normal);
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}
</style>
