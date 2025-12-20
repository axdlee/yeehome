/**
 * IPC 错误类型测试
 */

import { describe, it, expect } from 'vitest'

// IPC 响应类型
interface IPCResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    name: string
    code: string
    message: string
    statusCode?: number
    timestamp?: string
    context?: string
  }
}

// IPC 错误类
class IPCError extends Error {
  code: string
  statusCode: number
  timestamp: string
  context: string

  constructor(error: IPCResponse['error']) {
    super(error?.message || '未知错误')
    this.name = error?.name || 'IPCError'
    this.code = error?.code || 'UNKNOWN_ERROR'
    this.statusCode = error?.statusCode || 500
    this.timestamp = error?.timestamp || new Date().toISOString()
    this.context = error?.context || 'IPC'
  }
}

describe('IPCError', () => {
  describe('constructor', () => {
    it('should create error with default values when no error provided', () => {
      const error = new IPCError(undefined)

      expect(error.message).toBe('未知错误')
      expect(error.name).toBe('IPCError')
      expect(error.code).toBe('UNKNOWN_ERROR')
      expect(error.statusCode).toBe(500)
      expect(error.context).toBe('IPC')
    })

    it('should create error with provided values', () => {
      const errorData = {
        name: 'DeviceError',
        code: 'DEVICE_OFFLINE',
        message: 'Device is offline',
        statusCode: 503,
        timestamp: '2024-01-01T00:00:00Z',
        context: 'togglePower'
      }

      const error = new IPCError(errorData)

      expect(error.message).toBe('Device is offline')
      expect(error.name).toBe('DeviceError')
      expect(error.code).toBe('DEVICE_OFFLINE')
      expect(error.statusCode).toBe(503)
      expect(error.timestamp).toBe('2024-01-01T00:00:00Z')
      expect(error.context).toBe('togglePower')
    })

    it('should extend Error class', () => {
      const error = new IPCError({ message: 'test' })

      expect(error instanceof Error).toBe(true)
      expect(error instanceof IPCError).toBe(true)
    })

    it('should have stack trace', () => {
      const error = new IPCError({ message: 'test' })

      expect(error.stack).toBeDefined()
      expect(typeof error.stack).toBe('string')
    })
  })

  describe('error codes', () => {
    it('should handle DEVICE_OFFLINE code', () => {
      const error = new IPCError({
        code: 'DEVICE_OFFLINE',
        message: 'Device is offline'
      })

      expect(error.code).toBe('DEVICE_OFFLINE')
    })

    it('should handle DEVICE_TIMEOUT code', () => {
      const error = new IPCError({
        code: 'DEVICE_TIMEOUT',
        message: 'Device response timeout'
      })

      expect(error.code).toBe('DEVICE_TIMEOUT')
    })

    it('should handle AUTH_ERROR code', () => {
      const error = new IPCError({
        code: 'AUTH_ERROR',
        message: 'Authentication failed'
      })

      expect(error.code).toBe('AUTH_ERROR')
    })

    it('should handle UNKNOWN_ERROR for unrecognized codes', () => {
      const error = new IPCError({
        code: 'SOME_UNKNOWN_CODE',
        message: 'Some error'
      })

      expect(error.code).toBe('SOME_UNKNOWN_CODE')
    })
  })
})

describe('IPCResponse', () => {
  describe('success response', () => {
    it('should have success flag', () => {
      const response: IPCResponse<string> = {
        success: true,
        data: 'test data'
      }

      expect(response.success).toBe(true)
      expect(response.data).toBe('test data')
      expect(response.error).toBeUndefined()
    })

    it('should handle null data', () => {
      const response: IPCResponse<null> = {
        success: true,
        data: null
      }

      expect(response.success).toBe(true)
      expect(response.data).toBeNull()
    })
  })

  describe('error response', () => {
    it('should have error field', () => {
      const response: IPCResponse<string> = {
        success: false,
        error: {
          name: 'TestError',
          code: 'TEST_CODE',
          message: 'Test error message'
        }
      }

      expect(response.success).toBe(false)
      expect(response.data).toBeUndefined()
      expect(response.error?.code).toBe('TEST_CODE')
    })
  })
})
