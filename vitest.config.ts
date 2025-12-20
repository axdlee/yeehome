import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['tests/unit/**/*.{test,spec}.{js,ts}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      include: ['src/renderer/**/*.{ts,vue}'],
      exclude: [
        'src/renderer/main.ts',
        'src/renderer/App.vue',
        'src/renderer/**/*.d.ts',
        'src/renderer/auto-imports.d.ts',
        'src/renderer/components.d.ts'
      ]
    },
    setupFiles: ['tests/setup.ts'],
    deps: {
      inline: ['element-plus']
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@services': path.resolve(__dirname, './src/services'),
      '@renderer': path.resolve(__dirname, './src/renderer')
    }
  }
})
