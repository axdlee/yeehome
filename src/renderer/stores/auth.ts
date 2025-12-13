/**
 * Auth Store - 认证状态管理
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import ipcService from '@/renderer/services/ipc.service'
import { ElMessage } from 'element-plus'

export const useAuthStore = defineStore('auth', () => {
  // ==================== State ====================

  // 是否已认证
  const isAuthenticated = ref(false)
  // 是否正在认证
  const isAuthenticating = ref(false)
  // 认证错误信息
  const authError = ref<string | null>(null)
  // Token 过期时间
  const tokenExpiresAt = ref<number | null>(null)

  // ==================== Getters ====================

  // Token 是否即将过期 (小于5分钟)
  const isTokenExpiringSoon = computed(() => {
    if (!tokenExpiresAt.value) return false
    const fiveMinutes = 5 * 60 * 1000
    return tokenExpiresAt.value - Date.now() < fiveMinutes
  })

  // ==================== Actions ====================

  // 检查认证状态
  async function checkAuthStatus(): Promise<boolean> {
    try {
      const status = await ipcService.getAuthStatus()
      isAuthenticated.value = status.authenticated
      tokenExpiresAt.value = status.expiresAt || null
      return status.authenticated
    } catch (error) {
      console.error('检查认证状态失败:', error)
      isAuthenticated.value = false
      return false
    }
  }

  // 获取授权URL
  async function getAuthorizationUrl(): Promise<string | null> {
    try {
      const state = Math.random().toString(36).substring(7)
      const url = await ipcService.getAuthorizationUrl(state)
      return url
    } catch (error) {
      console.error('获取授权URL失败:', error)
      ElMessage.error('获取授权URL失败')
      return null
    }
  }

  // 使用授权码获取Token
  async function authenticate(code: string): Promise<boolean> {
    if (isAuthenticating.value) return false

    isAuthenticating.value = true
    authError.value = null

    try {
      const result = await ipcService.getAccessToken(code)
      if (result.access_token) {
        isAuthenticated.value = true
        ElMessage.success('云端认证成功')
        return true
      }
      return false
    } catch (error: any) {
      console.error('认证失败:', error)
      authError.value = error.message || '认证失败'
      ElMessage.error('云端认证失败')
      return false
    } finally {
      isAuthenticating.value = false
    }
  }

  // 登出
  async function logout(): Promise<void> {
    try {
      await ipcService.logout()
      isAuthenticated.value = false
      tokenExpiresAt.value = null
      ElMessage.success('已退出云端登录')
    } catch (error) {
      console.error('登出失败:', error)
      ElMessage.error('登出失败')
    }
  }

  // ==================== 事件监听 ====================

  function setupEventListeners(): void {
    ipcService.on('cloudAuthenticated', () => {
      isAuthenticated.value = true
      checkAuthStatus()
    })

    ipcService.on('cloudTokenRefreshed', () => {
      checkAuthStatus()
    })

    ipcService.on('cloudLogout', () => {
      isAuthenticated.value = false
      tokenExpiresAt.value = null
    })

    ipcService.on('cloudAuthError', (error: Error) => {
      authError.value = error.message
      isAuthenticated.value = false
    })

    // OAuth 回调处理
    ipcService.on('oauthCallback', async (code: string) => {
      if (code) {
        await authenticate(code)
      }
    })
  }

  function cleanupEventListeners(): void {
    ipcService.off('cloudAuthenticated')
    ipcService.off('cloudTokenRefreshed')
    ipcService.off('cloudLogout')
    ipcService.off('cloudAuthError')
    ipcService.off('oauthCallback')
  }

  return {
    // State
    isAuthenticated,
    isAuthenticating,
    authError,
    tokenExpiresAt,
    // Getters
    isTokenExpiringSoon,
    // Actions
    checkAuthStatus,
    getAuthorizationUrl,
    authenticate,
    logout,
    // 事件监听
    setupEventListeners,
    cleanupEventListeners
  }
})
