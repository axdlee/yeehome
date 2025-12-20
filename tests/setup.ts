import { config } from '@vue/test-utils'
import { vi } from 'vitest'

// 全局 Vue 测试工具配置
config.global.stubs = {
  transition: {
    template: '<slot />'
  },
  'transition-group': {
    template: '<slot />'
  }
}

// Mock Electron API for tests
global.window = {
  electron: {
    ipcRenderer: {
      invoke: vi.fn(),
      on: vi.fn(),
      removeListener: vi.fn()
    }
  }
}

// Mock console methods to reduce noise in tests
if (process.env.VITEST_SILENT === 'true') {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
}

// Set default test timeout
vi.setConfig({ testTimeout: 10000 })
