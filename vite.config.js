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
          'vue-vendor': ['vue'],
          'axios-vendor': ['axios']
        },
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js'
      }
    },
    // 生产环境优化
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // 保留console.log便于调试,生产环境可设为true
        drop_debugger: true
      }
    }
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
