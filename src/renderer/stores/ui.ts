import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type Theme = 'light' | 'dark'

export const useUIStore = defineStore('ui', () => {
  // State
  const theme = ref<Theme>('light')
  const sidebarCollapsed = ref(false)
  const isLoading = ref(false)
  const loadingText = ref('')

  // Getters
  const isDark = computed(() => theme.value === 'dark')

  // Actions
  function setTheme(newTheme: Theme) {
    theme.value = newTheme
    document.documentElement.setAttribute('data-theme', newTheme)
    localStorage.setItem('yeehome-theme', newTheme)
  }

  function toggleTheme() {
    const newTheme = theme.value === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
  }

  function initTheme() {
    const saved = localStorage.getItem('yeehome-theme') as Theme | null
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const initialTheme = saved || (prefersDark ? 'dark' : 'light')
    setTheme(initialTheme)
  }

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  function setSidebarCollapsed(collapsed: boolean) {
    sidebarCollapsed.value = collapsed
  }

  function startLoading(text = '加载中...') {
    isLoading.value = true
    loadingText.value = text
  }

  function stopLoading() {
    isLoading.value = false
    loadingText.value = ''
  }

  return {
    // State
    theme,
    sidebarCollapsed,
    isLoading,
    loadingText,
    // Getters
    isDark,
    // Actions
    setTheme,
    toggleTheme,
    initTheme,
    toggleSidebar,
    setSidebarCollapsed,
    startLoading,
    stopLoading
  }
})
