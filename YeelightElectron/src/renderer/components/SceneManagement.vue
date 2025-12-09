<template>
  <div class="scene-management">
    <h2 class="section-title">情景管理</h2>
    
    <!-- 添加情景按钮 -->
    <div class="control-group">
      <button class="refresh-button" @click="showAddForm = true">添加情景</button>
    </div>
    
    <!-- 添加/编辑情景表单 -->
    <div v-if="showAddForm || editingScene" class="scene-form">
      <h3>{{ editingScene ? '编辑情景' : '添加情景' }}</h3>
      <div class="form-group">
        <label>情景名称</label>
        <input 
          type="text" 
          v-model="sceneName" 
          placeholder="请输入情景名称"
          @keyup.enter="saveScene"
        >
      </div>
      <div class="form-group">
        <label>情景描述</label>
        <input 
          type="text" 
          v-model="sceneDescription" 
          placeholder="请输入情景描述"
        >
      </div>
      <div class="form-actions">
        <button class="refresh-button" @click="saveScene">保存</button>
        <button class="cancel-button" @click="cancelEdit">取消</button>
      </div>
    </div>
    
    <!-- 情景列表 -->
    <div class="scene-list">
      <div 
        v-for="scene in scenes" 
        :key="scene.id"
        class="scene-card"
      >
        <div class="scene-info">
          <h3>{{ scene.name }}</h3>
          <p>{{ scene.description }}</p>
        </div>
        <div class="scene-actions">
          <button class="apply-button" @click="applyScene(scene)">应用</button>
          <button class="edit-button" @click="editScene(scene)">编辑</button>
          <button class="delete-button" @click="deleteScene(scene.id)">删除</button>
        </div>
      </div>
    </div>
    
    <div v-if="scenes.length === 0" class="no-scenes">
      <p>暂无情景，请添加一个情景</p>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'

export default {
  name: 'SceneManagement',
  setup() {
    const scenes = ref([])
    const showAddForm = ref(false)
    const editingScene = ref(null)
    const sceneName = ref('')
    const sceneDescription = ref('')
    
    // 模拟数据 - 实际项目中应该从后端或本地存储获取
    const mockScenes = [
      { id: 1, name: '阅读模式', description: '适合阅读的灯光设置' },
      { id: 2, name: '观影模式', description: '适合看电影的灯光设置' },
      { id: 3, name: '睡眠模式', description: '帮助睡眠的灯光设置' }
    ]
    
    // 加载情景数据
    const loadScenes = () => {
      // 实际项目中应该从后端或本地存储获取
      scenes.value = mockScenes
    }
    
    // 添加或编辑情景
    const saveScene = () => {
      if (!sceneName.value.trim()) {
        alert('请输入情景名称')
        return
      }
      
      if (editingScene.value) {
        // 编辑情景
        const index = scenes.value.findIndex(s => s.id === editingScene.value.id)
        if (index !== -1) {
          scenes.value[index].name = sceneName.value
          scenes.value[index].description = sceneDescription.value
        }
      } else {
        // 添加情景
        const newScene = {
          id: Date.now(),
          name: sceneName.value,
          description: sceneDescription.value
        }
        scenes.value.push(newScene)
      }
      
      // 重置表单
      resetForm()
    }
    
    // 编辑情景
    const editScene = (scene) => {
      editingScene.value = scene
      sceneName.value = scene.name
      sceneDescription.value = scene.description
      showAddForm.value = false
    }
    
    // 删除情景
    const deleteScene = (sceneId) => {
      if (confirm('确定要删除这个情景吗？')) {
        scenes.value = scenes.value.filter(s => s.id !== sceneId)
      }
    }
    
    // 应用情景
    const applyScene = (scene) => {
      console.log('应用情景:', scene)
      // 实际项目中应该调用API来应用情景
      alert(`已应用情景: ${scene.name}`)
    }
    
    // 取消编辑
    const cancelEdit = () => {
      resetForm()
    }
    
    // 重置表单
    const resetForm = () => {
      showAddForm.value = false
      editingScene.value = null
      sceneName.value = ''
      sceneDescription.value = ''
    }
    
    // 组件挂载时加载情景数据
    onMounted(() => {
      loadScenes()
    })
    
    return {
      scenes,
      showAddForm,
      editingScene,
      sceneName,
      sceneDescription,
      saveScene,
      editScene,
      deleteScene,
      applyScene,
      cancelEdit
    }
  }
}
</script>

<style scoped>
.scene-management {
  max-width: 800px;
  margin: 0 auto;
}

.scene-form {
  background-color: #f9f9f9;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.scene-form h3 {
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

.scene-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
}

.scene-card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  background-color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.scene-info h3 {
  margin-bottom: 5px;
  color: #2c3e50;
}

.scene-info p {
  color: #7f8c8d;
  font-size: 14px;
  margin-bottom: 15px;
}

.scene-actions {
  display: flex;
  gap: 10px;
  margin-top: auto;
}

.apply-button {
  flex: 1;
  padding: 8px 12px;
  background-color: #2ecc71;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.apply-button:hover {
  background-color: #27ae60;
}

.edit-button {
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

.no-scenes {
  text-align: center;
  padding: 40px 0;
  color: #7f8c8d;
  font-size: 16px;
}
</style>