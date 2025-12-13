/**
 * 灯组类型定义
 */

// 灯组接口
export interface Group {
  id: string                    // 灯组ID
  name: string                  // 灯组名称
  deviceIds: string[]           // 灯组内设备ID列表
  createdAt?: Date              // 创建时间
  updatedAt?: Date              // 更新时间
}

// 灯组表单数据
export interface GroupFormData {
  name: string
  deviceIds: string[]
}

// 灯组统计信息
export interface GroupStats {
  totalDevices: number          // 总设备数
  powerOnDevices: number        // 开启设备数
}
