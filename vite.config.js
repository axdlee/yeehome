import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  base: './', // 使用相对路径

  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // 代码分割优化
    rollupOptions: {
      output: {
        // 分离第三方库以提高缓存效率
        manualChunks: {
          'vue-vendor': ['vue']
        },
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js'
      }
    },
    // 使用 esbuild 压缩(Vite内置,无需额外安装)
    minify: 'esbuild'
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@services': path.resolve(__dirname, './src/services'),
      '@renderer': path.resolve(__dirname, './src/renderer')
    }
  },

  plugins: [
    vue()
  ],

  // 开发服务器配置
  server: {
    port: 3000,
    strictPort: false,
    open: false
  }
})
