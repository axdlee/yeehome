<template>
  <div class="device-detail">
    <!-- 消息提示 -->
    <div v-if="message" :class="['message', messageType]">
      {{ message }}
    </div>
    
    <!-- 加载状态 -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-spinner"></div>
    </div>
    
    <button class="refresh-button" @click="goBack">
      <span class="arrow-left">←</span>
      返回设备列表
    </button>
    
    <h2 class="section-title">{{ device.name || device.model || '未知设备' }}</h2>
    
    <!-- 基本信息 -->
    <div class="control-group">
      <h3>📋 基本信息</h3>
      <p><strong>名称:</strong> {{ device.name || '未命名' }}</p>
      <p><strong>型号:</strong> {{ device.model || '未知' }}</p>
      <p><strong>类型:</strong> 
        <span class="type-tag" :class="device.device_type === 'pro' ? 'pro' : 'standard'">
          {{ deviceTypeName }}
        </span>
      </p>
      <p><strong>IP地址:</strong> {{ device.host }}:{{ device.port }}</p>
      <p><strong>设备ID:</strong> {{ device.id || '未知' }}</p>
      <p><strong>固件版本:</strong> {{ device.firmware_version || '未知' }}</p>
      <p><strong>电源状态:</strong> 
        <span :class="['status-badge', device.power === 'on' ? 'on' : 'off']">
          {{ device.power === 'on' ? '开启' : '关闭' }}
        </span>
      </p>
    </div>
    
    <!-- 电源控制 -->
    <div class="control-group">
      <h3>⚡ 电源控制</h3>
      <label class="control-label">
        <div>电源开关</div>
        <div class="toggle-switch">
          <input 
            type="checkbox" 
            v-model="power"
            @change="togglePower"
            :disabled="isLoading"
          >
          <span class="toggle-slider"></span>
        </div>
      </label>
    </div>
    
    <!-- 亮度调节 - 仅在设备支持时显示 -->
    <div v-if="supportsBrightness" class="control-group">
      <h3>💡 亮度调节</h3>
      <label class="control-label">
        <div>当前亮度: <strong>{{ brightness }}%</strong></div>
        <input 
          type="range" 
          min="1" 
          max="100" 
          v-model="brightness"
          @change="setBrightness"
          :disabled="isLoading || !power"
        >
        <div class="range-values">
          <span>1%</span>
          <span>100%</span>
        </div>
      </label>
    </div>
    
    <!-- 色温调节 - 仅在设备支持时显示 -->
    <div v-if="supportsColorTemperature" class="control-group">
      <h3>🌡️ 色温调节</h3>
      <label class="control-label">
        <div>当前色温: <strong>{{ colorTemperature }}K</strong></div>
        <input 
          type="range" 
          min="1700" 
          max="6500" 
          v-model="colorTemperature"
          @change="setColorTemperature"
          :disabled="isLoading || !power"
        >
        <div class="range-values">
          <span>1700K (暖光)</span>
          <span>6500K (冷光)</span>
        </div>
      </label>
    </div>
    
    <!-- 颜色调节 - 仅在设备支持时显示 -->
    <div v-if="supportsColor" class="control-group">
      <h3>🎨 颜色调节</h3>
      <label class="control-label">
        <div>选择颜色</div>
        <div class="color-picker">
          <input 
            type="color" 
            v-model="color"
            @change="setColor"
            :disabled="isLoading || !power"
          >
          <span class="color-value">{{ color }}</span>
        </div>
      </label>
    </div>
    
    <!-- 设备支持功能列表 -->
    <div class="control-group">
      <h3>✅ 支持功能</h3>
      <div class="support-features">
        <span 
          v-for="(feature, index) in device.support" 
          :key="index"
          class="feature-tag"
        >
          {{ feature === 'set_rgb' ? 'RGB调色' : 
             feature === 'set_ct_abx' ? '色温调节' : 
             feature === 'set_bright' ? '亮度调节' : 
             feature === 'set_power' ? '电源控制' : 
             feature === 'set_scene' ? '情景模式' : 
             feature.split('_').pop() }}
        </span>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue'
import ipcService from '../services/IPCService'

export default {
  name: 'DeviceDetail',
  props: {
    device: {
      type: Object,
      required: true
    }
  },
  emits: ['back'],
  setup(props, { emit }) {
    // 设备状态
    const power = ref(props.device.power === 'on' || false)
    const brightness = ref(props.device.bright || 50)
    const colorTemperature = ref(props.device.ct || 4000)
    const color = ref('#ffffff')
    const isLoading = ref(false)
    const message = ref('')
    const messageType = ref('success') // success, error, info
    
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
    
    // 根据设备支持的功能显示控制选项
    const supportsBrightness = computed(() => {
      return props.device.support?.includes('set_bright') || false
    })
    
    const supportsColorTemperature = computed(() => {
      return props.device.support?.includes('set_ct_abx') || false
    })
    
    const supportsColor = computed(() => {
      return props.device.support?.includes('set_rgb') || false
    })
    
    // 格式化设备类型
    const deviceTypeName = computed(() => {
      if (props.device.model) {
        const modelType = props.device.model.split('_')[0]
        return deviceTypeMap[modelType] || '未知设备'
      }
      return deviceTypeMap[props.device.device_type] || '未知设备'
    })
    
    // 返回设备列表
    const goBack = () => {
      emit('back')
    }
    
    // 显示消息
    const showMessage = (text, type = 'success', duration = 3000) => {
      message.value = text
      messageType.value = type
      setTimeout(() => {
        message.value = ''
      }, duration)
    }
    
    // 切换电源
    const togglePower = async () => {
      isLoading.value = true
      try {
        await ipcService.togglePower(props.device.id, power.value)
        showMessage(`设备已${power.value ? '开启' : '关闭'}`)
      } catch (error) {
        console.error('电源切换失败:', error)
        showMessage('电源切换失败', 'error')
        // 恢复原状态
        power.value = !power.value
      } finally {
        isLoading.value = false
      }
    }
    
    // 设置亮度
    const setBrightness = async () => {
      if (!supportsBrightness.value) return
      isLoading.value = true
      try {
        await ipcService.setBrightness(props.device.id, brightness.value)
        showMessage(`亮度已设置为 ${brightness.value}%`)
      } catch (error) {
        console.error('亮度设置失败:', error)
        showMessage('亮度设置失败', 'error')
      } finally {
        isLoading.value = false
      }
    }
    
    // 设置色温
    const setColorTemperature = async () => {
      if (!supportsColorTemperature.value) return
      isLoading.value = true
      try {
        await ipcService.setColorTemperature(props.device.id, colorTemperature.value)
        showMessage(`色温已设置为 ${colorTemperature.value}K`)
      } catch (error) {
        console.error('色温设置失败:', error)
        showMessage('色温设置失败', 'error')
      } finally {
        isLoading.value = false
      }
    }
    
    // 设置颜色
    const setColor = async () => {
      if (!supportsColor.value) return
      isLoading.value = true
      try {
        // 将十六进制颜色转换为RGB
        const rgb = parseInt(color.value.replace('#', ''), 16)
        await ipcService.setColor(props.device.id, rgb)
        showMessage('颜色设置成功')
      } catch (error) {
        console.error('颜色设置失败:', error)
        showMessage('颜色设置失败', 'error')
      } finally {
        isLoading.value = false
      }
    }
    
    // 监听设备属性变化，更新本地状态
    watch(() => props.device.power, (newPower) => {
      power.value = newPower === 'on'
    })
    
    watch(() => props.device.bright, (newBrightness) => {
      if (newBrightness !== undefined) {
        brightness.value = newBrightness
      }
    })
    
    watch(() => props.device.ct, (newCt) => {
      if (newCt !== undefined) {
        colorTemperature.value = newCt
      }
    })

    return {
      power,
      brightness,
      colorTemperature,
      color,
      isLoading,
      message,
      messageType,
      supportsBrightness,
      supportsColorTemperature,
      supportsColor,
      deviceTypeName,
      goBack,
      togglePower,
      setBrightness,
      setColorTemperature,
      setColor,
      showMessage
    }
  }
}
</script>

<style scoped>
.device-detail {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  background-color: #fafafa;
  min-height: 100vh;
}

.section-title {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 24px 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.section-title::before {
  content: '💡';
  font-size: 28px;
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
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
}

.refresh-button:hover {
  background-color: #66b1ff;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

.control-group {
  background-color: #ffffff;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid #e0e0e0;
  transition: all 0.3s ease;
}

.control-group:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.control-group h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-group p {
  margin: 8px 0;
  color: #606266;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-group p strong {
  color: #303133;
  min-width: 80px;
  font-weight: 500;
}

/* 电源开关 */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 60px;
  height: 34px;
  margin-top: 8px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: .4s;
  border-radius: 34px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 26px;
  width: 26px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}

input:checked + .toggle-slider {
  background-color: #67c23a;
}

input:focus + .toggle-slider {
  box-shadow: 0 0 1px #67c23a;
}

input:checked + .toggle-slider:before {
  transform: translateX(26px);
}

/* 滑块样式 */
input[type="range"] {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: #e0e0e0;
  outline: none;
  -webkit-appearance: none;
  margin: 12px 0;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #409eff;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  transition: all 0.2s ease;
}

input[type="range"]::-webkit-slider-thumb:hover {
  background: #66b1ff;
  transform: scale(1.2);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

input[type="range"]::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #409eff;
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  transition: all 0.2s ease;
}

input[type="range"]::-moz-range-thumb:hover {
  background: #66b1ff;
  transform: scale(1.2);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

/* 颜色选择器 */
.color-picker {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
}

.color-picker input[type="color"] {
  width: 60px;
  height: 60px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.color-picker input[type="color"]:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.color-picker span {
  font-family: 'Courier New', monospace;
  font-size: 14px;
  color: #333;
  background-color: #f5f7fa;
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid #e4e7ed;
  min-width: 80px;
  text-align: center;
}

/* 消息提示 */
.message {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  animation: slideIn 0.3s ease;
}

.message.success {
  background-color: #f0f9eb;
  color: #67c23a;
  border: 1px solid #e1f3d8;
}

.message.error {
  background-color: #fef0f0;
  color: #f56c6c;
  border: 1px solid #fbc4ab;
}

.message.info {
  background-color: #ecf5ff;
  color: #409eff;
  border: 1px solid #d9ecff;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* 加载状态 */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #409eff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 类型标签 */
.type-tag {
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: inline-block;
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

/* 状态徽章 */
.status-badge {
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
  display: inline-block;
}

.status-badge.on {
  background-color: #f0f9eb;
  color: #67c23a;
  border: 1px solid #e1f3d8;
}

.status-badge.off {
  background-color: #fef0f0;
  color: #f56c6c;
  border: 1px solid #fbc4ab;
}

/* 箭头图标 */
.arrow-left {
  font-size: 16px;
  font-weight: bold;
}

/* 控制标签 */
.control-label {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.control-label div {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

.control-label strong {
  color: #303133;
}

/* 范围值 */
.range-values {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #909399;
  margin-top: -8px;
}

/* 支持功能 */
.support-features {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.feature-tag {
  background-color: #ecf5ff;
  color: #409eff;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 12px;
  border: 1px solid #d9ecff;
  transition: all 0.2s ease;
  cursor: default;
  user-select: none;
}

.feature-tag:hover {
  background-color: #409eff;
  color: #ffffff;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
}

/* 禁用状态样式 */
input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

input:disabled + .toggle-slider {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 颜色值显示 */
.color-value {
  font-family: 'Courier New', monospace;
  font-size: 14px;
  color: #333;
  background-color: #f5f7fa;
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid #e4e7ed;
  min-width: 100px;
  text-align: center;
  text-transform: uppercase;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .device-detail {
    padding: 10px;
  }
  
  .control-group {
    padding: 16px;
  }
  
  .section-title {
    font-size: 20px;
  }
  
  .support-features {
    justify-content: center;
  }
  
  .control-label {
    gap: 8px;
  }
}
</style>
