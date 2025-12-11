<template>
  <div class="app-container">
    <!-- 侧边栏 -->
    <aside class="sidebar">
      <h1>Yeelight Client</h1>
      <ul class="sidebar-nav">
        <li>
          <a :class="{ active: currentView === 'devices' }" @click="currentView = 'devices'">
            设备列表
          </a>
        </li>
        <li>
          <a :class="{ active: currentView === 'rooms' }" @click="currentView = 'rooms'">
            房间管理
          </a>
        </li>
        <li>
          <a :class="{ active: currentView === 'scenes' }" @click="currentView = 'scenes'">
            情景管理
          </a>
        </li>
        <li>
          <a :class="{ active: currentView === 'groups' }" @click="currentView = 'groups'">
            灯组管理
          </a>
        </li>
        <li>
          <a :class="{ active: currentView === 'automations' }" @click="currentView = 'automations'">
            自动化管理
          </a>
        </li>
      </ul>
    </aside>

    <!-- 主内容区 -->
    <main class="main-content">
      <!-- 设备列表 -->
      <DeviceList 
        v-if="currentView === 'devices'"
        @select-device="selectDevice"
      />

      <!-- 设备详情 -->
      <DeviceDetail 
        v-else-if="currentView === 'device-detail' && selectedDevice"
        :device="selectedDevice"
        @back="currentView = 'devices'"
      />

      <!-- 房间管理 -->
      <RoomManagement 
        v-else-if="currentView === 'rooms'"
      />

      <!-- 情景管理 -->
      <SceneManagement 
        v-else-if="currentView === 'scenes'"
      />

      <!-- 灯组管理 -->
      <GroupManagement 
        v-else-if="currentView === 'groups'"
      />

      <!-- 自动化管理 -->
      <AutomationManagement 
        v-else-if="currentView === 'automations'"
      />
    </main>
  </div>
</template>

<script>
import { ref } from 'vue'
import DeviceList from './components/DeviceList.vue'
import DeviceDetail from './components/DeviceDetail.vue'
import RoomManagement from './components/RoomManagement.vue'
import SceneManagement from './components/SceneManagement.vue'
import GroupManagement from './components/GroupManagement.vue'
import AutomationManagement from './components/AutomationManagement.vue'

export default {
  name: 'App',
  components: {
    DeviceList,
    DeviceDetail,
    RoomManagement,
    SceneManagement,
    GroupManagement,
    AutomationManagement
  },
  setup() {
    const currentView = ref('devices')
    const selectedDevice = ref(null)

    const selectDevice = (device) => {
      selectedDevice.value = device
      currentView.value = 'device-detail'
    }

    return {
      currentView,
      selectedDevice,
      selectDevice
    }
  }
}
</script>

<style>
/* 全局样式重置 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 16px;
  line-height: 1.6;
  color: #333;
  background-color: #f5f7fa;
}

/* 应用容器 */
.app-container {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

/* 侧边栏样式 */
.sidebar {
  width: 220px;
  background-color: #2c3e50;
  color: #ffffff;
  padding: 20px 0;
  box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}

.sidebar h1 {
  font-size: 20px;
  font-weight: 600;
  text-align: center;
  margin-bottom: 30px;
  color: #409eff;
  padding: 0 20px;
}

.sidebar-nav {
  list-style: none;
  flex: 1;
}

.sidebar-nav li {
  margin-bottom: 5px;
}

.sidebar-nav a {
  display: block;
  padding: 12px 20px;
  color: #b0b8c1;
  text-decoration: none;
  transition: all 0.3s ease;
  border-left: 3px solid transparent;
}

.sidebar-nav a:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  border-left-color: #409eff;
}

.sidebar-nav a.active {
  background-color: rgba(64, 158, 255, 0.2);
  color: #409eff;
  border-left-color: #409eff;
  font-weight: 500;
}

/* 主内容区样式 */
.main-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  background-color: #ffffff;
}

/* 滚动条样式 */
.main-content::-webkit-scrollbar {
  width: 8px;
}

.main-content::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.main-content::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.main-content::-webkit-scrollbar-thumb:hover {
  background: #a1a1a1;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .app-container {
    flex-direction: column;
  }

  .sidebar {
    width: 100%;
    height: auto;
    padding: 10px 0;
  }

  .sidebar h1 {
    margin-bottom: 15px;
    font-size: 18px;
  }

  .sidebar-nav {
    display: flex;
    overflow-x: auto;
    white-space: nowrap;
  }

  .sidebar-nav li {
    margin-bottom: 0;
    margin-right: 5px;
  }

  .sidebar-nav a {
    padding: 8px 12px;
    border-left: none;
    border-bottom: 3px solid transparent;
  }

  .sidebar-nav a:hover,
  .sidebar-nav a.active {
    border-left-color: transparent;
    border-bottom-color: #409eff;
  }

  .main-content {
    padding: 10px;
  }
}
</style>
