/**
 * Room Store - 房间状态管理
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Room, RoomFormData } from '@/renderer/types/room'
import ipcService from '@/renderer/services/ipc.service'
import { ElMessage } from 'element-plus'

export const useRoomStore = defineStore('room', () => {
  // ==================== State ====================

  const rooms = ref<Room[]>([])
  const isLoading = ref(false)
  const selectedRoom = ref<Room | null>(null)

  // ==================== Getters ====================

  const roomCount = computed(() => rooms.value.length)

  // ==================== Actions ====================

  // 同步房间列表
  async function syncRooms(): Promise<void> {
    console.log('[RoomStore] 开始同步房间...')
    isLoading.value = true
    try {
      console.log('[RoomStore] 调用 cloudSyncRooms()...')
      const cloudRooms = await ipcService.cloudSyncRooms()
      console.log('[RoomStore] 同步成功，房间数量:', cloudRooms.length)
      rooms.value = cloudRooms
    } catch (error) {
      console.error('[RoomStore] 同步房间失败:', error)
      ElMessage.error('同步房间失败')
    } finally {
      isLoading.value = false
      console.log('[RoomStore] 同步完成，isLoading:', isLoading.value)
    }
  }

  // 获取房间列表
  async function fetchRooms(): Promise<void> {
    isLoading.value = true
    try {
      rooms.value = await ipcService.cloudGetRooms()
    } catch (error) {
      console.error('获取房间失败:', error)
    } finally {
      isLoading.value = false
    }
  }

  // 根据ID获取房间
  function getRoomById(id: string): Room | undefined {
    return rooms.value.find(r => r.id === id)
  }

  // 选中房间
  function selectRoom(room: Room | null): void {
    selectedRoom.value = room
  }

  // ==================== 事件监听 ====================

  function setupEventListeners(): void {
    ipcService.on('cloudRoomsSynced', (cloudRooms: Room[]) => {
      rooms.value = cloudRooms
    })
  }

  function cleanupEventListeners(): void {
    ipcService.off('cloudRoomsSynced')
  }

  return {
    // State
    rooms,
    isLoading,
    selectedRoom,
    // Getters
    roomCount,
    // Actions
    syncRooms,
    fetchRooms,
    getRoomById,
    selectRoom,
    // 事件监听
    setupEventListeners,
    cleanupEventListeners
  }
})
