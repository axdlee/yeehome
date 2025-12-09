<template>
  <div class="room-management">
    <h2 class="section-title">房间管理</h2>
    
    <!-- 添加房间按钮 -->
    <div class="control-group">
      <button class="refresh-button" @click="showAddForm = true">添加房间</button>
    </div>
    
    <!-- 添加/编辑房间表单 -->
    <div v-if="showAddForm || editingRoom" class="room-form">
      <h3>{{ editingRoom ? '编辑房间' : '添加房间' }}</h3>
      <div class="form-group">
        <label>房间名称</label>
        <input 
          type="text" 
          v-model="roomName" 
          placeholder="请输入房间名称"
          @keyup.enter="saveRoom"
        >
      </div>
      <div class="form-actions">
        <button class="refresh-button" @click="saveRoom">保存</button>
        <button class="cancel-button" @click="cancelEdit">取消</button>
      </div>
    </div>
    
    <!-- 房间列表 -->
    <div class="room-list">
      <div 
        v-for="room in rooms" 
        :key="room.id"
        class="room-card"
      >
        <div class="room-info">
          <h3>{{ room.name }}</h3>
          <p>{{ room.devices.length }} 个设备</p>
        </div>
        <div class="room-actions">
          <button class="edit-button" @click="editRoom(room)">编辑</button>
          <button class="delete-button" @click="deleteRoom(room.id)">删除</button>
        </div>
      </div>
    </div>
    
    <div v-if="rooms.length === 0" class="no-rooms">
      <p>暂无房间，请添加一个房间</p>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'

export default {
  name: 'RoomManagement',
  setup() {
    const rooms = ref([])
    const showAddForm = ref(false)
    const editingRoom = ref(null)
    const roomName = ref('')
    
    // 模拟数据 - 实际项目中应该从后端或本地存储获取
    const mockRooms = [
      { id: 1, name: '客厅', devices: [1, 2] },
      { id: 2, name: '卧室', devices: [3] },
      { id: 3, name: '书房', devices: [4] }
    ]
    
    // 加载房间数据
    const loadRooms = () => {
      // 实际项目中应该从后端或本地存储获取
      rooms.value = mockRooms
    }
    
    // 添加或编辑房间
    const saveRoom = () => {
      if (!roomName.value.trim()) {
        alert('请输入房间名称')
        return
      }
      
      if (editingRoom.value) {
        // 编辑房间
        const index = rooms.value.findIndex(r => r.id === editingRoom.value.id)
        if (index !== -1) {
          rooms.value[index].name = roomName.value
        }
      } else {
        // 添加房间
        const newRoom = {
          id: Date.now(),
          name: roomName.value,
          devices: []
        }
        rooms.value.push(newRoom)
      }
      
      // 重置表单
      resetForm()
    }
    
    // 编辑房间
    const editRoom = (room) => {
      editingRoom.value = room
      roomName.value = room.name
      showAddForm.value = false
    }
    
    // 删除房间
    const deleteRoom = (roomId) => {
      if (confirm('确定要删除这个房间吗？')) {
        rooms.value = rooms.value.filter(r => r.id !== roomId)
      }
    }
    
    // 取消编辑
    const cancelEdit = () => {
      resetForm()
    }
    
    // 重置表单
    const resetForm = () => {
      showAddForm.value = false
      editingRoom.value = null
      roomName.value = ''
    }
    
    // 组件挂载时加载房间数据
    onMounted(() => {
      loadRooms()
    })
    
    return {
      rooms,
      showAddForm,
      editingRoom,
      roomName,
      saveRoom,
      editRoom,
      deleteRoom,
      cancelEdit
    }
  }
}
</script>

<style scoped>
.room-management {
  max-width: 800px;
  margin: 0 auto;
}

.room-form {
  background-color: #f9f9f9;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.room-form h3 {
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

.room-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
}

.room-card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  background-color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.room-info h3 {
  margin-bottom: 5px;
  color: #2c3e50;
}

.room-info p {
  color: #7f8c8d;
  font-size: 14px;
}

.room-actions {
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

.no-rooms {
  text-align: center;
  padding: 40px 0;
  color: #7f8c8d;
  font-size: 16px;
}
</style>