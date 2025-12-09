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
        v-if="currentView === 'device-detail' && selectedDevice"
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
