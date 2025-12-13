<template>
  <div class="device-grid">
    <!-- 空状态 -->
    <div v-if="devices.length === 0" class="empty-state">
      <el-empty :description="emptyText">
        <template #image>
          <el-icon :size="64" color="var(--color-text-secondary)">
            <Cpu />
          </el-icon>
        </template>
        <el-button v-if="showRefreshButton" type="primary" @click="$emit('refresh')">
          刷新设备
        </el-button>
      </el-empty>
    </div>

    <!-- 设备网格 -->
    <div v-else class="grid-container">
      <DeviceCard
        v-for="device in devices"
        :key="device.id"
        :device="device"
        @click="handleDeviceClick"
        @power-change="handlePowerChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Cpu } from '@element-plus/icons-vue'
import type { Device } from '@/renderer/types/device'
import DeviceCard from './DeviceCard.vue'

interface Props {
  devices: Device[]
  emptyText?: string
  showRefreshButton?: boolean
}

interface Emits {
  (e: 'device-click', device: Device): void
  (e: 'power-change', deviceId: string, power: boolean): void
  (e: 'refresh'): void
}

const props = withDefaults(defineProps<Props>(), {
  emptyText: '暂无设备',
  showRefreshButton: true
})

const emit = defineEmits<Emits>()

const handleDeviceClick = (device: Device) => {
  emit('device-click', device)
}

const handlePowerChange = (deviceId: string, power: boolean) => {
  emit('power-change', deviceId, power)
}
</script>

<style scoped lang="scss">
.device-grid {
  width: 100%;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
}

.grid-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--spacing-lg);
}
</style>
