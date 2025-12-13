import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/devices'
  },
  {
    path: '/devices',
    name: 'Devices',
    component: () => import('@/renderer/views/DevicesView.vue'),
    meta: {
      title: '设备列表',
      icon: 'Cpu'
    }
  },
  {
    path: '/devices/:id',
    name: 'DeviceDetail',
    component: () => import('@/renderer/views/DeviceDetailView.vue'),
    meta: {
      title: '设备详情',
      hidden: true
    }
  },
  {
    path: '/rooms',
    name: 'Rooms',
    component: () => import('@/renderer/views/RoomsView.vue'),
    meta: {
      title: '房间管理',
      icon: 'House'
    }
  },
  {
    path: '/scenes',
    name: 'Scenes',
    component: () => import('@/renderer/views/ScenesView.vue'),
    meta: {
      title: '情景管理',
      icon: 'MagicStick'
    }
  },
  {
    path: '/groups',
    name: 'Groups',
    component: () => import('@/renderer/views/GroupsView.vue'),
    meta: {
      title: '灯组管理',
      icon: 'Collection'
    }
  },
  {
    path: '/automations',
    name: 'Automations',
    component: () => import('@/renderer/views/AutomationsView.vue'),
    meta: {
      title: '自动化管理',
      icon: 'Setting'
    }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/renderer/views/SettingsView.vue'),
    meta: {
      title: '设置',
      icon: 'Tools'
    }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  // 设置页面标题
  if (to.meta.title) {
    document.title = `${to.meta.title} - YeeHome`
  }
  next()
})

export default router
