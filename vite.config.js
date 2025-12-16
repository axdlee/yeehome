import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

// https://vitejs.dev/config/
export default defineConfig({
  base: './', // 使用相对路径

  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    chunkSizeWarningLimit: 600,
    cssCodeSplit: true,
    sourcemap: false,
    // 代码分割优化
    rollupOptions: {
      output: {
        // 分离第三方库以提高缓存效率
        manualChunks: {
          'vue-core': ['vue', 'vue-router', 'pinia'],
          'element-plus': ['element-plus'],
          'element-icons': ['@element-plus/icons-vue']
        },
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js'
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
    vue(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
      imports: ['vue', 'vue-router', 'pinia'],
      dts: 'src/auto-imports.d.ts'
    }),
    Components({
      resolvers: [ElementPlusResolver()],
      dts: 'src/components.d.ts'
    })
  ],

  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "@/renderer/styles/variables.scss" as *;`
      }
    }
  },

  // 开发服务器配置
  server: {
    port: 3000,
    strictPort: false,
    open: false
  }
})
