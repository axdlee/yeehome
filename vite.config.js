import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  base: './', // 使用相对路径
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: undefined,
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  // 使用html插件配置脚本注入位置
  plugins: [
    vue(),
    {
      name: 'html-inject-body',
      transformIndexHtml(html, ctx) {
        // 将脚本从head移动到body末尾
        const headScriptRegex = /<script.*?<\/script>/g
        const stylesRegex = /<link.*?\/\s*>/g
        
        let headScripts = []
        let styles = []
        
        // 提取head中的脚本和样式
        let processedHtml = html
        .replace(headScriptRegex, (match) => {
            headScripts.push(match)
            return ''
        })
        .replace(stylesRegex, (match) => {
            styles.push(match)
            return ''
        })
        
        // 将样式添加到head
        const headEndIndex = processedHtml.indexOf('</head>')
        if (headEndIndex !== -1) {
            processedHtml = processedHtml.substring(0, headEndIndex) + styles.join('') + processedHtml.substring(headEndIndex)
        }
        
        // 将脚本添加到body末尾
        const bodyEndIndex = processedHtml.indexOf('</body>')
        if (bodyEndIndex !== -1) {
            processedHtml = processedHtml.substring(0, bodyEndIndex) + headScripts.join('') + processedHtml.substring(bodyEndIndex)
        }
        
        return processedHtml
      }
    }
  ]
})
