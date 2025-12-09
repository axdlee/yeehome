<template>
  <div class="group-management">
    <h2 class="section-title">灯组管理</h2>
    
    <!-- 添加灯组按钮 -->
    <div class="control-group">
      <button class="refresh-button" @click="showAddForm = true">添加灯组</button>
    </div>
    
    <!-- 添加/编辑灯组表单 -->
    <div v-if="showAddForm || editingGroup" class="group-form">
      <h3>{{ editingGroup ? '编辑灯组' : '添加灯组' }}</h3>
      <div class="form-group">
        <label>灯组名称</label>
        <input 
          type="text" 
          v-model="groupName" 
          placeholder="请输入灯组名称"
          @keyup.enter="saveGroup"
        >
      </div>
      <div class="form-actions">
        <button class="refresh-button" @click="saveGroup">保存</button>
        <button class="cancel-button" @click="cancelEdit">取消</button>
      </div>
    </div>
    
    <!-- 灯组列表 -->
    <div class="group-list">
      <div 
        v-for="group in groups" 
        :key="group.id"
        class="group-card"
      >
        <div class="group-info">
          <h3>{{ group.name }}</h3>
          <p>{{ group.devices.length }} 个设备</p>
        </div>
        <div class="group-actions">
          <button class="edit-button" @click="editGroup(group)">编辑</button>
          <button class="delete-button" @click="deleteGroup(group.id)">删除</button>
        </div>
      </div>
    </div>
    
    <div v-if="groups.length === 0" class="no-groups">
      <p>暂无灯组，请添加一个灯组</p>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'

export default {
  name: 'GroupManagement',
  setup() {
    const groups = ref([])
    const showAddForm = ref(false)
    const editingGroup = ref(null)
    const groupName = ref('')
    
    // 模拟数据 - 实际项目中应该从后端或本地存储获取
    const mockGroups = [
      { id: 1, name: '客厅灯组', devices: [1, 2] },
      { id: 2, name: '卧室灯组', devices: [3] },
      { id: 3, name: '书房灯组', devices: [4] }
    ]
    
    // 加载灯组数据
    const loadGroups = () => {
      // 实际项目中应该从后端或本地存储获取
      groups.value = mockGroups
    }
    
    // 添加或编辑灯组
    const saveGroup = () => {
      if (!groupName.value.trim()) {
        alert('请输入灯组名称')
        return
      }
      
      if (editingGroup.value) {
        // 编辑灯组
        const index = groups.value.findIndex(g => g.id === editingGroup.value.id)
        if (index !== -1) {
          groups.value[index].name = groupName.value
        }
      } else {
        // 添加灯组
        const newGroup = {
          id: Date.now(),
          name: groupName.value,
          devices: []
        }
        groups.value.push(newGroup)
      }
      
      // 重置表单
      resetForm()
    }
    
    // 编辑灯组
    const editGroup = (group) => {
      editingGroup.value = group
      groupName.value = group.name
      showAddForm.value = false
    }
    
    // 删除灯组
    const deleteGroup = (groupId) => {
      if (confirm('确定要删除这个灯组吗？')) {
        groups.value = groups.value.filter(g => g.id !== groupId)
      }
    }
    
    // 取消编辑
    const cancelEdit = () => {
      resetForm()
    }
    
    // 重置表单
    const resetForm = () => {
      showAddForm.value = false
      editingGroup.value = null
      groupName.value = ''
    }
    
    // 组件挂载时加载灯组数据
    onMounted(() => {
      loadGroups()
    })
    
    return {
      groups,
      showAddForm,
      editingGroup,
      groupName,
      saveGroup,
      editGroup,
      deleteGroup,
      cancelEdit
    }
  }
}
</script>

<style scoped>
.group-management {
  max-width: 800px;
  margin: 0 auto;
}

.group-form {
  background-color: #f9f9f9;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.group-form h3 {
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

.form-group input {
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

.group-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
}

.group-card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  background-color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.group-info h3 {
  margin-bottom: 5px;
  color: #2c3e50;
}

.group-info p {
  color: #7f8c8d;
  font-size: 14px;
}

.group-actions {
  display: flex;
  gap: 10px;
}

.edit-button {
  padding: 5px 10px;
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
  padding: 5px 10px;
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

.no-groups {
  text-align: center;
  padding: 40px 0;
  color: #7f8c8d;
  font-size: 16px;
}
</style>