/**
 * 房间类型定义
 */

// 房间接口
export interface Room {
  id: string                    // 房间ID
  name: string                  // 房间名称
  icon?: string                 // 房间图标
  deviceIds: string[]           // 房间内设备ID列表
  createdAt?: Date              // 创建时间
  updatedAt?: Date              // 更新时间
}

// 房间表单数据
export interface RoomFormData {
  name: string
  icon?: string
  deviceIds?: string[]
}

// 房间统计信息
export interface RoomStats {
  totalDevices: number          // 总设备数
  onlineDevices: number         // 在线设备数
  powerOnDevices: number        // 开启设备数
}
