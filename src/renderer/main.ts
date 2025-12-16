import { createApp } from 'vue'
import { ElMessage, ElMessageBox, ElLoading, ElNotification } from 'element-plus'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
// 仅引入必要的样式 - 组件样式由 unplugin-vue-components 按需加载
import 'element-plus/dist/index.css'

import App from './App.vue'
import router from './router'
import pinia from './stores'

// 导入全局样式
import './styles/base.scss'
import './styles/transitions.scss'

console.log('Vue应用开始初始化...')

const app = createApp(App)

// 注册 Pinia
app.use(pinia)
console.log('Pinia 已注册')

// 注册 Vue Router
app.use(router)
console.log('Vue Router 已注册')

// 配置 Element Plus 全局属性
app.config.globalProperties.$ELEMENT = {
  locale: zhCn,
  size: 'default'
}

// 注册需要全局使用的 Element Plus 插件
app.config.globalProperties.$message = ElMessage
app.config.globalProperties.$msgbox = ElMessageBox
app.config.globalProperties.$loading = ElLoading
app.config.globalProperties.$notify = ElNotification

console.log('Element Plus 已配置')

app.mount('#app')
console.log('Vue应用挂载成功')
