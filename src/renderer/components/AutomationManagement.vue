<template>
  <div class="automation-management">
    <h2 class="section-title">自动化管理</h2>
    
    <!-- 添加自动化按钮 -->
    <div class="control-group">
      <button class="refresh-button" @click="showAddForm = true">添加自动化</button>
    </div>
    
    <!-- 添加/编辑自动化表单 -->
    <div v-if="showAddForm || editingAutomation" class="automation-form">
      <h3>{{ editingAutomation ? '编辑自动化' : '添加自动化' }}</h3>
      <div class="form-group">
        <label>自动化名称</label>
        <input 
          type="text" 
          v-model="automationName" 
          placeholder="请输入自动化名称"
          @keyup.enter="saveAutomation"
        >
      </div>
      <div class="form-group">
        <label>触发条件</label>
        <select v-model="automationTrigger">
          <option value="time">时间触发</option>
          <option value="scene">场景触发</option>
          <option value="device">设备触发</option>
        </select>
      </div>
      <div class="form-actions">
        <button class="refresh-button" @click="saveAutomation">保存</button>
        <button class="cancel-button" @click="cancelEdit">取消</button>
      </div>
    </div>
    
    <!-- 自动化列表 -->
    <div class="automation-list">
      <div 
        v-for="automation in automations" 
        :key="automation.id"
        class="automation-card"
      >
        <div class="automation-info">
          <h3>{{ automation.name }}</h3>
          <p>{{ getTriggerText(automation.trigger) }}</p>
          <div class="toggle-switch">
            <input 
              type="checkbox" 
              v-model="automation.enabled"
              @change="toggleAutomation(automation)"
            >
            <span class="toggle-slider"></span>
          </div>
        </div>
        <div class="automation-actions">
          <button class="edit-button" @click="editAutomation(automation)">编辑</button>
          <button class="delete-button" @click="deleteAutomation(automation.id)">删除</button>
        </div>
      </div>
    </div>
    
    <div v-if="automations.length === 0" class="no-automations">
      <p>暂无自动化，请添加一个自动化</p>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'

export default {
  name: 'AutomationManagement',
  setup() {
    const automations = ref([])
    const showAddForm = ref(false)
    const editingAutomation = ref(null)
    const automationName = ref('')
    const automationTrigger = ref('time')
    
    // 模拟数据 - 实际项目中应该从后端或本地存储获取
    const mockAutomations = [
      { id: 1, name: '早上自动开灯', trigger: 'time', enabled: true },
      { id: 2, name: '晚上自动关灯', trigger: 'time', enabled: true },
      { id: 3, name: '观影模式自动触发', trigger: 'scene', enabled: false }
    ]
    
    // 加载自动化数据
    const loadAutomations = () => {
      // 实际项目中应该从后端或本地存储获取
      automations.value = mockAutomations
    }
    
    // 获取触发条件文本
    const getTriggerText = (trigger) => {
      switch(trigger) {
        case 'time': return '时间触发'
        case 'scene': return '场景触发'
        case 'device': return '设备触发'
        default: return '未知触发条件'
      }
    }
    
    // 添加或编辑自动化
    const saveAutomation = () => {
      if (!automationName.value.trim()) {
        alert('请输入自动化名称')
        return
      }
      
      if (editingAutomation.value) {
        // 编辑自动化
        const index = automations.value.findIndex(a => a.id === editingAutomation.value.id)
        if (index !== -1) {
          automations.value[index].name = automationName.value
          automations.value[index].trigger = automationTrigger.value
        }
      } else {
        // 添加自动化
        const newAutomation = {
          id: Date.now(),
          name: automationName.value,
          trigger: automationTrigger.value,
          enabled: true
        }
        automations.value.push(newAutomation)
      }
      
      // 重置表单
      resetForm()
    }
    
    // 编辑自动化
    const editAutomation = (automation) => {
      editingAutomation.value = automation
      automationName.value = automation.name
      automationTrigger.value = automation.trigger
      showAddForm.value = false
    }
    
    // 删除自动化
    const deleteAutomation = (automationId) => {
      if (confirm('确定要删除这个自动化吗？')) {
        automations.value = automations.value.filter(a => a.id !== automationId)
      }
    }
    
    // 切换自动化开关
    const toggleAutomation = (automation) => {
      console.log('切换自动化开关:', automation)
      // 实际项目中应该调用API来切换自动化开关
      alert(`自动化 ${automation.name} 已${automation.enabled ? '开启' : '关闭'}`)
    }
    
    // 取消编辑
    const cancelEdit = () => {
      resetForm()
    }
    
    // 重置表单
    const resetForm = () => {
      showAddForm.value = false
      editingAutomation.value = null
      automationName.value = ''
      automationTrigger.value = 'time'
    }
    
    // 组件挂载时加载自动化数据
    onMounted(() => {
      loadAutomations()
    })
    
    return {
      automations,
      showAddForm,
      editingAutomation,
      automationName,
      automationTrigger,
      saveAutomation,
      editAutomation,
      deleteAutomation,
      toggleAutomation,
      cancelEdit,
      getTriggerText
    }
  }
}
</script>

<style scoped>
.automation-management {
  max-width: 800px;
  margin: 0 auto;
}

.automation-form {
  background-color: #f9f9f9;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.automation-form h3 {
  margin-bottom: 20px;
  color: #2c3e50;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  color: #34495e;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 16px;
}

.form-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.cancel-button {
  padding: 10px 20px;
  background-color: #95a5a6;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.cancel-button:hover {
  background-color: #7f8c8d;
}

.automation-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.automation-card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  background-color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.automation-info h3 {
  margin-bottom: 5px;
  color: #2c3e50;
}

.automation-info p {
  color: #7f8c8d;
  font-size: 14px;
  margin-bottom: 15px;
}

.automation-info .toggle-switch {
  margin-bottom: 15px;
}

.automation-actions {
  display: flex;
  gap: 10px;
  margin-top: auto;
}

.edit-button {
  flex: 1;
  padding: 8px 12px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.edit-button:hover {
  background-color: #2980b9;
}

.delete-button {
  padding: 8px 12px;
  background-color: #e74c3c;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.delete-button:hover {
  background-color: #c0392b;
}

.no-automations {
  text-align: center;
  padding: 40px 0;
  color: #7f8c8d;
  font-size: 16px;
}
</style>