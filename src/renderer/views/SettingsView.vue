<template>
  <div class="settings-view">
    <h1 class="page-title">设置</h1>

    <!-- 云端账号设置 -->
    <el-card class="settings-card">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <el-icon :size="20"><User /></el-icon>
            <span>云端账号</span>
          </div>
          <el-tag :type="authStore.isAuthenticated ? 'success' : 'info'" effect="plain">
            {{ authStore.isAuthenticated ? '已登录' : '未登录' }}
          </el-tag>
        </div>
      </template>

      <div class="auth-section">
        <!-- 已登录状态 -->
        <div v-if="authStore.isAuthenticated" class="logged-in">
          <div class="auth-info">
            <el-icon :size="48" class="avatar-icon"><Avatar /></el-icon>
            <div class="auth-details">
              <p class="auth-status">Yeelight 云端账号已连接</p>
              <p class="auth-hint">您可以访问云端设备、房间、情景和自动化功能</p>
            </div>
          </div>
          <el-button type="danger" plain @click="handleLogout">
            退出登录
          </el-button>
        </div>

        <!-- 未登录状态 -->
        <div v-else class="not-logged-in">
          <div class="auth-info">
            <el-icon :size="48" class="avatar-icon is-gray"><Avatar /></el-icon>
            <div class="auth-details">
              <p class="auth-status">未连接 Yeelight 云端账号</p>
              <p class="auth-hint">登录后可同步云端设备、房间分组和自动化规则</p>
            </div>
          </div>
          <el-button
            type="primary"
            :loading="authStore.isAuthenticating"
            @click="handleLogin"
          >
            登录 Yeelight 账号
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 外观设置 -->
    <el-card class="settings-card">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <el-icon :size="20"><Brush /></el-icon>
            <span>外观设置</span>
          </div>
        </div>
      </template>

      <div class="settings-item">
        <div class="item-left">
          <span class="item-label">主题模式</span>
          <span class="item-desc">选择应用的显示主题</span>
        </div>
        <div class="item-right">
          <el-radio-group v-model="currentTheme" @change="handleThemeChange">
            <el-radio-button value="light">
              <el-icon><Sunny /></el-icon>
              <span>浅色</span>
            </el-radio-button>
            <el-radio-button value="dark">
              <el-icon><Moon /></el-icon>
              <span>深色</span>
            </el-radio-button>
          </el-radio-group>
        </div>
      </div>

      <el-divider />

      <div class="settings-item">
        <div class="item-left">
          <span class="item-label">侧边栏</span>
          <span class="item-desc">默认折叠侧边栏</span>
        </div>
        <div class="item-right">
          <el-switch
            v-model="sidebarCollapsed"
            @change="handleSidebarChange"
          />
        </div>
      </div>
    </el-card>

    <!-- 设备发现设置 -->
    <el-card class="settings-card">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <el-icon :size="20"><Cpu /></el-icon>
            <span>设备发现</span>
          </div>
        </div>
      </template>

      <div class="settings-item">
        <div class="item-left">
          <span class="item-label">自动发现</span>
          <span class="item-desc">启动时自动搜索本地设备</span>
        </div>
        <div class="item-right">
          <el-switch v-model="autoDiscover" @change="handleAutoDiscoverChange" />
        </div>
      </div>

      <el-divider />

      <div class="settings-item">
        <div class="item-left">
          <span class="item-label">发现超时</span>
          <span class="item-desc">设备发现等待时间(秒)</span>
        </div>
        <div class="item-right">
          <el-input-number
            v-model="discoverTimeout"
            :min="3"
            :max="30"
            :step="1"
            @change="handleTimeoutChange"
          />
        </div>
      </div>
    </el-card>

    <!-- 关于 -->
    <el-card class="settings-card">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <el-icon :size="20"><InfoFilled /></el-icon>
            <span>关于</span>
          </div>
        </div>
      </template>

      <div class="about-section">
        <div class="app-info">
          <h3 class="app-name">YeeHome</h3>
          <p class="app-version">版本 1.0.0</p>
          <p class="app-desc">Yeelight 智能灯具桌面控制应用</p>
        </div>

        <el-divider />

        <div class="links-section">
          <el-button text @click="openLink('https://github.com')">
            <el-icon><Link /></el-icon>
            GitHub 仓库
          </el-button>
          <el-button text @click="openLink('https://www.yeelight.com')">
            <el-icon><Link /></el-icon>
            Yeelight 官网
          </el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import {
  User,
  Avatar,
  Brush,
  Sunny,
  Moon,
  Cpu,
  InfoFilled,
  Link
} from '@element-plus/icons-vue'
import { useAuthStore } from '@/renderer/stores/auth'
import { useUIStore, type Theme } from '@/renderer/stores/ui'
import ipcService from '@/renderer/services/ipc.service'
import { ElMessage, ElMessageBox } from 'element-plus'

const authStore = useAuthStore()
const uiStore = useUIStore()

// 本地状态
const currentTheme = ref<Theme>(uiStore.theme)
const sidebarCollapsed = ref(uiStore.sidebarCollapsed)
const autoDiscover = ref(true)
const discoverTimeout = ref(10)

// 方法
const handleLogin = async () => {
  const url = await authStore.getAuthorizationUrl()
  if (url) {
    // 打开浏览器进行OAuth认证
    await ipcService.openExternal(url)
    ElMessage.info('请在浏览器中完成登录')
  }
}

const handleLogout = async () => {
  try {
    await ElMessageBox.confirm(
      '退出后将无法访问云端设备和功能，确定要退出吗？',
      '确认退出',
      {
        confirmButtonText: '确定退出',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    await authStore.logout()
  } catch {
    // 用户取消
  }
}

const handleThemeChange = (theme: Theme) => {
  uiStore.setTheme(theme)
}

const handleSidebarChange = (collapsed: boolean) => {
  uiStore.setSidebarCollapsed(collapsed)
}

const handleAutoDiscoverChange = (value: boolean) => {
  localStorage.setItem('yeehome-auto-discover', String(value))
}

const handleTimeoutChange = (value: number) => {
  localStorage.setItem('yeehome-discover-timeout', String(value))
}

const openLink = async (url: string) => {
  await ipcService.openExternal(url)
}

// 加载设置
const loadSettings = () => {
  const savedAutoDiscover = localStorage.getItem('yeehome-auto-discover')
  if (savedAutoDiscover !== null) {
    autoDiscover.value = savedAutoDiscover === 'true'
  }

  const savedTimeout = localStorage.getItem('yeehome-discover-timeout')
  if (savedTimeout !== null) {
    discoverTimeout.value = parseInt(savedTimeout, 10)
  }
}

// 生命周期
onMounted(() => {
  authStore.setupEventListeners()
  authStore.checkAuthStatus()
  loadSettings()
})

onUnmounted(() => {
  authStore.cleanupEventListeners()
})
</script>

<style scoped lang="scss">
.settings-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: var(--spacing-lg);
  gap: var(--spacing-lg);
  overflow-y: auto;
}

.page-title {
  margin: 0 0 var(--spacing-md);
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--color-text-primary);
}

.settings-card {
  :deep(.el-card__header) {
    padding: var(--spacing-md);
    background-color: var(--color-bg-light);
  }

  :deep(.el-card__body) {
    padding: var(--spacing-lg);
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .header-left {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    font-weight: 600;
    color: var(--color-text-primary);
  }
}

// 认证部分
.auth-section {
  .logged-in,
  .not-logged-in {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--spacing-lg);
  }

  .auth-info {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
  }

  .avatar-icon {
    color: var(--color-primary);

    &.is-gray {
      color: var(--color-text-secondary);
    }
  }

  .auth-details {
    .auth-status {
      margin: 0 0 var(--spacing-xs);
      font-weight: 500;
      color: var(--color-text-primary);
    }

    .auth-hint {
      margin: 0;
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
    }
  }
}

// 设置项
.settings-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-lg);
}

.item-left {
  flex: 1;

  .item-label {
    display: block;
    font-weight: 500;
    color: var(--color-text-primary);
    margin-bottom: var(--spacing-xs);
  }

  .item-desc {
    display: block;
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }
}

.item-right {
  :deep(.el-radio-button__inner) {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
  }
}

// 关于部分
.about-section {
  .app-info {
    text-align: center;
    padding: var(--spacing-md) 0;
  }

  .app-name {
    margin: 0 0 var(--spacing-xs);
    font-size: var(--font-size-lg);
    font-weight: 600;
    color: var(--color-primary);
  }

  .app-version {
    margin: 0 0 var(--spacing-xs);
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  .app-desc {
    margin: 0;
    color: var(--color-text-regular);
  }

  .links-section {
    display: flex;
    justify-content: center;
    gap: var(--spacing-md);
  }
}

// 响应式
@media (max-width: 768px) {
  .auth-section {
    .logged-in,
    .not-logged-in {
      flex-direction: column;
      align-items: flex-start;
    }
  }

  .settings-item {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-sm);
  }
}
</style>
