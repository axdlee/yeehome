<template>
  <el-config-provider :locale="zhCn">
    <AppLayout>
      <router-view v-slot="{ Component }">
        <transition name="fade-slide" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </AppLayout>
  </el-config-provider>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { ElConfigProvider } from 'element-plus'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import AppLayout from './components/layout/AppLayout.vue'
import { useAuthStore } from './stores/auth'

const authStore = useAuthStore()

// 应用启动时检查认证状态
onMounted(async () => {
  console.log('[App] 应用启动，检查认证状态...')
  authStore.setupEventListeners()
  const isAuth = await authStore.checkAuthStatus()
  console.log('[App] 认证状态:', isAuth)
})
</script>

<style>
/* 全局样式已通过 main.ts 引入 */
</style>
