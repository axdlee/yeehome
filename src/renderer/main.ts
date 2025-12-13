import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import 'element-plus/dist/index.css'

import App from './App.vue'
import router from './router'
import pinia from './stores'

// 导入全局样式
import './styles/variables.scss'
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

// 注册 Element Plus
app.use(ElementPlus, {
  locale: zhCn,
  size: 'default'
})
console.log('Element Plus 已注册')

// 注册 Element Plus 图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}
console.log('Element Plus Icons 已注册')

app.mount('#app')
console.log('Vue应用挂载成功')
