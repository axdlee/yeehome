<template>
  <div class="device-list-container">
    <div class="control-group">
      <button 
        class="refresh-button" 
        @click="discoverDevices"
        :disabled="isDiscovering"
      >
        <span v-if="isDiscovering" class="search-indicator-small"></span>
        {{ isDiscovering ? '搜索中...' : '刷新设备列表' }}
      </button>
      <div class="search-status" v-if="isDiscovering">
        <span class="search-indicator"></span>
        正在搜索设备... ({{ devices.length }}个设备已发现)
      </div>
      <div class="device-count" v-if="!isDiscovering && devices.length > 0">
        共发现 {{ devices.length }} 个设备
      </div>
    </div>
    
    <h2 class="section-title">设备列表</h2>
    
    <div class="device-list">
      <div 
        v-for="device in devices" 
        :key="device.id"
        class="device-card"
        @click="selectDevice(device)"
      >
        <div class="device-header">
          <h3>
            <span class="device-icon">{{ getDeviceIcon(device) }}</span>
            {{ formatDeviceName(device) }}
          </h3>
          <div 
            :class="['device-status', device.power === 'on' ? 'on' : 'off']"
            @click="togglePower(device, $event)"
          >
            <span class="status-dot"></span>
            {{ device.power === 'on' ? '开启' : '关闭' }}
          </div>
        </div>
        
        <div class="device-info">
          <p><strong>型号:</strong> {{ device.model || '未知' }}</p>
          <p><strong>类型:</strong> 
            <span class="type-tag" :class="device.device_type === 'pro' ? 'pro' : 'standard'">
              {{ deviceTypeMap[device.model?.split('_')[0]] || (device.device_type === 'pro' ? 'Pro系列' : '标准系列') }}
            </span>
          </p>
          <p><strong>IP地址:</strong> {{ device.host }}:{{ device.port }}</p>
          <p><strong>固件:</strong> {{ device.firmware_version || '未知' }}</p>
          <p v-if="device.bright !== undefined"><strong>亮度:</strong> {{ device.bright }}%</p>
          <p v-if="device.ct !== undefined"><strong>色温:</strong> {{ device.ct }}K</p>
        </div>
        
        <div class="device-support">
          <strong>支持功能:</strong>
          <div class="support-tags">
            <span 
              v-for="(operation, index) in device.support.slice(0, 5)" 
              :key="index"
              class="support-tag"
              :title="operation"
            >
              {{ operation === 'set_rgb' ? 'RGB调色' : 
                 operation === 'set_ct_abx' ? '色温调节' : 
                 operation === 'set_bright' ? '亮度调节' : 
                 operation === 'set_power' ? '电源控制' : 
                 operation === 'set_scene' ? '情景模式' : 
                 operation.split('_').pop() }}
            </span>
            <span v-if="device.support.length > 5" class="support-more" :title="device.support.slice(5).join(', ')">
              +{{ device.support.length - 5 }}个
            </span>
          </div>
        </div>
        
        <div class="quick-actions">
          <button 
            class="quick-action-btn"
            @click="togglePower(device, $event)"
            :title="device.power === 'on' ? '关闭设备' : '开启设备'"
          >
            {{ device.power === 'on' ? '关闭' : '开启' }}
          </button>
        </div>
      </div>
    </div>
    
    <div v-if="devices.length === 0" class="no-devices">
      <div class="no-devices-icon">🔍</div>
      <p>未发现设备</p>
      <p class="no-devices-hint">请确保设备已开启并在同一局域网内</p>
      <button class="refresh-button" @click="discoverDevices">重新搜索</button>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import ipcService from '../services/IPCService'

export default {
  name: 'DeviceList',
  emits: ['select-device'],
  setup(props, { emit }) {
    const devices = ref([])
    const isDiscovering = ref(false)
    
    // 设备类型映射
    const deviceTypeMap = {
      'mono': '单色灯',
      'color': '彩色灯',
      'ct': '色温灯',
      'scene': '情景灯',
      'strip': '灯带',
      'ceiling': '吸顶灯',
      'pro': 'Pro系列',
      'standard': '标准系列'
    }
    
    // 获取设备图标
    const getDeviceIcon = (device) => {
      if (device.model && device.model.includes('strip')) return '💡'
      if (device.model && device.model.includes('ceiling')) return '🏠'
      if (device.model && device.model.includes('bulb')) return '💡'
      if (device.support && device.support.includes('set_rgb')) return '🎨'
      if (device.support && device.support.includes('set_ct_abx')) return '🌡️'
      return '💡'
    }
    
    // 格式化设备名称
    const formatDeviceName = (device) => {
      if (device.name) return device.name
      if (device.model) return `${deviceTypeMap[device.model.split('_')[0]] || '未知设备'} (${device.model})`
      return '未知设备'
    }
    
    // 发现设备
    const discoverDevices = async () => {
      devices.value = []
      isDiscovering.value = true
      
      console.log('开始搜索Yeelight设备...')
      
      try {
        await ipcService.discoverDevices()
        console.log('设备搜索请求已发送')
        
        // 获取当前设备列表
        const currentDevices = await ipcService.getDevices()
        devices.value = currentDevices
      } catch (error) {
        console.error('设备搜索失败:', error)
      } finally {
        isDiscovering.value = false
      }
    }

    // 选择设备
    const selectDevice = (device) => {
      emit('select-device', device)
    }
    
    // 快速切换电源
    const togglePower = async (device, event) => {
      event.stopPropagation() // 阻止事件冒泡，避免触发selectDevice
      try {
        // 使用togglePower方法，参数为设备ID和目标电源状态
        const targetPower = device.power === 'on' ? false : true
        await ipcService.togglePower(device.id, targetPower)
        // 更新本地设备状态
        const updatedDevice = devices.value.find(d => d.id === device.id)
        if (updatedDevice) {
          updatedDevice.power = targetPower ? 'on' : 'off'
        }
      } catch (error) {
        console.error('切换电源失败:', error)
      }
    }

    // 设备添加事件处理
    const handleDeviceAdded = (device) => {
      console.log('设备已添加:', device)
      // 检查设备是否已存在
      const existingDevice = devices.value.find(d => d.id === device.id)
      if (!existingDevice) {
        devices.value.push(device)
      }
    }

    // 设备发现完成事件处理
    const handleDiscoverDone = (discoveredDevices) => {
      console.log('设备发现完成:', discoveredDevices)
      devices.value = discoveredDevices
      isDiscovering.value = false
    }
    
    // 设备状态更新事件处理
    const handleDeviceUpdated = (updatedDevice) => {
      const index = devices.value.findIndex(d => d.id === updatedDevice.id)
      if (index !== -1) {
        devices.value[index] = { ...devices.value[index], ...updatedDevice }
      }
    }

    // 组件挂载时搜索设备
    onMounted(() => {
      // 注册事件监听器
      ipcService.on('deviceAdded', handleDeviceAdded)
      ipcService.on('discoverDone', handleDiscoverDone)
      ipcService.on('deviceUpdated', handleDeviceUpdated)
      
      // 开始搜索设备
      discoverDevices()
    })

    // 组件卸载时移除事件监听器
    onUnmounted(() => {
      // 移除事件监听器
      ipcService.off('deviceAdded')
      ipcService.off('discoverDone')
      ipcService.off('deviceUpdated')
    })

    return {
      devices,
      isDiscovering,
      discoverDevices,
      selectDevice,
      togglePower,
      getDeviceIcon,
      formatDeviceName,
      deviceTypeMap
    }
  }
}
</script>

<style scoped>
.device-list-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.device-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
  padding: 20px 0;
}

.device-card {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  padding: 20px;
  transition: all 0.3s ease;
  cursor: pointer;
  border: 1px solid #e0e0e0;
  position: relative;
  overflow: hidden;
}

.device-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 3px;
  background: linear-gradient(90deg, #409eff, #67c23a, #e6a23c, #f56c6c);
  transform: scaleX(0);
  transition: transform 0.3s ease;
}

.device-card:hover::before {
  transform: scaleX(1);
}

.device-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
  border-color: #409eff;
}

.device-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.device-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
  display: flex;
  align-items: center;
  gap: 8px;
  line-height: 1.2;
}

.device-icon {
  font-size: 20px;
  filter: drop-shadow(0 2px 2px rgba(0, 0, 0, 0.1));
}

.device-status {
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.device-status:hover {
  transform: scale(1.05);
}

.device-status.on {
  background-color: #f0f9eb;
  color: #67c23a;
  border: 1px solid #e1f3d8;
}

.device-status.off {
  background-color: #fef0f0;
  color: #f56c6c;
  border: 1px solid #fbc4ab;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: currentColor;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.device-info {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
  font-size: 14px;
  background-color: #fafafa;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
}

.device-info p {
  margin: 0;
  color: #606266;
  display: flex;
  align-items: center;
  gap: 6px;
  word-break: break-word;
}

.device-info p strong {
  color: #303133;
  min-width: 60px;
  font-weight: 500;
}

.type-tag {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.type-tag.pro {
  background-color: #e6f7ff;
  color: #1890ff;
  border: 1px solid #91d5ff;
}

.type-tag.standard {
  background-color: #f6ffed;
  color: #52c41a;
  border: 1px solid #b7eb8f;
}

.device-support {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px dashed #e8e8e8;
}

.device-support strong {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  color: #303133;
  font-weight: 500;
}

.support-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.support-tag {
  background-color: #ecf5ff;
  color: #409eff;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  border: 1px solid #d9ecff;
  transition: all 0.2s ease;
  cursor: help;
  user-select: none;
}

.support-tag:hover {
  background-color: #409eff;
  color: #ffffff;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
}

.support-more {
  background-color: #f5f7fa;
  color: #909399;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  border: 1px solid #e4e7ed;
  cursor: help;
  transition: all 0.2s ease;
}

.support-more:hover {
  background-color: #e4e7ed;
  color: #606266;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 0;
  flex-wrap: wrap;
  background-color: #fafafa;
  padding: 16px 20px;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
}

.refresh-button {
  background-color: #409eff;
  color: #ffffff;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 120px;
  justify-content: center;
}

.refresh-button:hover:not(:disabled) {
  background-color: #66b1ff;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

.refresh-button:disabled {
  background-color: #c6e2ff;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.search-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #909399;
  background-color: #ecf5ff;
  padding: 8px 16px;
  border-radius: 20px;
  border: 1px solid #d9ecff;
}

.search-indicator {
  width: 12px;
  height: 12px;
  border: 2px solid #409eff;
  border-top: 2px solid transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.search-indicator-small {
  width: 10px;
  height: 10px;
  border: 2px solid #ffffff;
  border-top: 2px solid transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.device-count {
  font-size: 14px;
  color: #67c23a;
  font-weight: 500;
  background-color: #f0f9eb;
  padding: 8px 16px;
  border-radius: 20px;
  border: 1px solid #e1f3d8;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  margin: 20px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title::before {
  content: '';
  width: 4px;
  height: 20px;
  background-color: #409eff;
  border-radius: 2px;
}

.no-devices {
  text-align: center;
  padding: 80px 20px;
  color: #909399;
  font-size: 16px;
  background-color: #fafafa;
  border-radius: 12px;
  border: 2px dashed #e8e8e8;
  margin-top: 20px;
}

.no-devices-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.no-devices p {
  margin: 8px 0;
  line-height: 1.5;
}

.no-devices-hint {
  font-size: 14px;
  opacity: 0.8;
  margin-bottom: 24px;
}

.no-devices .refresh-button {
  margin-top: 16px;
}

.quick-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  justify-content: flex-end;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.quick-action-btn {
  background-color: #f5f7fa;
  color: #606266;
  border: 1px solid #e4e7ed;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
}

.quick-action-btn:hover {
  background-color: #409eff;
  color: #ffffff;
  border-color: #409eff;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .device-list-container {
    padding: 10px;
  }
  
  .device-list {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .device-info {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  
  .control-group {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  
  .refresh-button {
    width: 100%;
  }
  
  .search-status,
  .device-count {
    text-align: center;
  }
}
</style>
