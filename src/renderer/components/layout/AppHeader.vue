<template>
  <el-header class="app-header">
    <!-- 发光线条 -->
    <div class="header-glow-line"></div>

    <!-- 页面标题区域 -->
    <div class="header-left">
      <div class="breadcrumb" v-if="showBreadcrumb">
        <span class="breadcrumb-item">{{ parentTitle }}</span>
        <el-icon class="breadcrumb-separator"><ArrowRight /></el-icon>
        <span class="breadcrumb-item current">{{ pageTitle }}</span>
      </div>
      <h2 v-else class="page-title">{{ pageTitle }}</h2>
    </div>

    <!-- 右侧操作区 -->
    <div class="header-right">
      <!-- 搜索按钮 -->
      <el-tooltip content="搜索" placement="bottom">
        <el-button
          :icon="Search"
          circle
          class="header-btn"
          @click="handleSearch"
        />
      </el-tooltip>

      <!-- 通知按钮 -->
      <el-tooltip content="通知" placement="bottom">
        <el-badge :value="3" :max="99" class="notification-badge">
          <el-button
            :icon="Bell"
            circle
            class="header-btn"
            @click="handleNotification"
          />
        </el-badge>
      </el-tooltip>

      <!-- 主题切换 -->
      <el-tooltip :content="isDark ? '切换到亮色模式' : '切换到暗色模式'" placement="bottom">
        <el-button
          :icon="isDark ? Sunny : Moon"
          circle
          class="header-btn theme-btn"
          @click="uiStore.toggleTheme()"
        />
      </el-tooltip>

      <!-- 用户头像 -->
      <el-dropdown trigger="click" @command="handleUserCommand">
        <div class="user-avatar">
          <el-avatar :size="36" :src="userAvatar">
            <el-icon><User /></el-icon>
          </el-avatar>
          <div class="avatar-ring"></div>
        </div>
        <template #dropdown>
          <el-dropdown-menu class="user-dropdown">
            <el-dropdown-item command="profile">
              <el-icon><User /></el-icon>
              个人资料
            </el-dropdown-item>
            <el-dropdown-item command="settings">
              <el-icon><Setting /></el-icon>
              设置
            </el-dropdown-item>
            <el-dropdown-item divided command="logout">
              <el-icon><SwitchButton /></el-icon>
              退出登录
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </el-header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Search,
  Bell,
  Sunny,
  Moon,
  User,
  Setting,
  SwitchButton,
  ArrowRight
} from '@element-plus/icons-vue'
import { useUIStore } from '@/renderer/stores/ui'

const route = useRoute()
const router = useRouter()
const uiStore = useUIStore()

// 页面标题
const pageTitle = computed(() =>
  (route.meta.title as string) || 'YeeHome'
)

// 父级标题（面包屑用）
const parentTitle = computed(() => {
  const meta = route.meta as Record<string, any>
  return meta.parentTitle || ''
})

// 是否显示面包屑
const showBreadcrumb = computed(() => {
  return false // 暂时不启用面包屑
})

// 是否暗色模式
const isDark = computed(() => uiStore.isDark)

// 用户头像
const userAvatar = computed(() => {
  return '' // 使用默认头像
})

// 搜索
const handleSearch = () => {
  // TODO: 实现搜索功能
  console.log('Search clicked')
}

// 通知
const handleNotification = () => {
  // TODO: 实现通知面板
  console.log('Notification clicked')
}

// 用户菜单命令
const handleUserCommand = (command: string) => {
  switch (command) {
    case 'profile':
      router.push('/profile')
      break
    case 'settings':
      router.push('/settings')
      break
    case 'logout':
      // 退出登录逻辑
      break
  }
}
</script>

<style scoped lang="scss">
.app-header {
  position: relative;
  height: var(--header-height);
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border-bottom: 1px solid var(--color-border-light);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--spacing-lg);
  overflow: hidden;

  // 发光线条
  .header-glow-line {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--gradient-primary);
    opacity: 0.5;
  }
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
  letter-spacing: -0.5px;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);

  .breadcrumb-item {
    color: var(--color-text-secondary);

    &.current {
      color: var(--color-text-primary);
      font-weight: 500;
    }
  }

  .breadcrumb-separator {
    color: var(--color-text-placeholder);
    font-size: 12px;
  }
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.header-btn {
  position: relative;
  background: transparent;
  border: 1px solid transparent;
  color: var(--color-text-secondary);
  transition: all var(--transition-fast);

  &:hover {
    background: rgba(59, 130, 246, 0.1);
    border-color: var(--color-primary-light-5);
    color: var(--color-primary);
    transform: translateY(-2px);
  }

  &.theme-btn {
    &:hover {
      background: rgba(139, 92, 246, 0.1);
      border-color: var(--color-secondary-light);
      color: var(--color-secondary);
    }
  }
}

.notification-badge {
  :deep(.el-badge__content) {
    background: var(--color-danger);
    border: none;
  }
}

.user-avatar {
  position: relative;
  cursor: pointer;
  padding: 2px;
  border-radius: 50%;
  transition: all var(--transition-fast);

  &:hover {
    transform: scale(1.05);

    .avatar-ring {
      opacity: 1;
      transform: scale(1.2);
    }
  }

  .avatar-ring {
    position: absolute;
    inset: -2px;
    border-radius: 50%;
    background: var(--gradient-primary);
    opacity: 0;
    z-index: -1;
    transition: all var(--transition-spring);
  }
}

// 下拉菜单样式
.user-dropdown {
  :deep(.el-dropdown-menu__item) {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-md);

    .el-icon {
      font-size: 16px;
      color: var(--color-text-secondary);
    }

    &:hover {
      background: rgba(59, 130, 246, 0.1);

      .el-icon {
        color: var(--color-primary);
      }
    }
  }
}

// 暗色主题适配
[data-theme="dark"] {
  .app-header {
    background: var(--glass-bg-dark);
    border-color: var(--color-border-light);
  }

  .header-btn {
    &:hover {
      background: rgba(59, 130, 246, 0.15);
    }

    &.theme-btn {
      &:hover {
        background: rgba(139, 92, 246, 0.15);
      }
    }
  }
}
</style>
