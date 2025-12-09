import { createApp } from 'vue'
import App from './App.vue'
import './style.css'

console.log('Vue应用开始初始化...')

const app = createApp(App)
console.log('Vue应用创建成功')

app.mount('#app')
console.log('Vue应用挂载成功')
