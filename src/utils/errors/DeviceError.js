const BaseError = require('./BaseError');

/**
 * 设备相关错误基类
 *
 * @class DeviceError
 * @extends BaseError
 */
class DeviceError extends BaseError {
  /**
   * @param {string} message - 错误消息
   * @param {string} deviceId - 设备ID
   * @param {string} [code='DEVICE_ERROR'] - 错误代码
   */
  constructor(message, deviceId, code = 'DEVICE_ERROR') {
    super(message, code, 500, { deviceId });
    this.deviceId = deviceId;
  }
}

/**
 * 设备未找到错误
 *
 * @class DeviceNotFoundError
 * @extends DeviceError
 */
class DeviceNotFoundError extends DeviceError {
  constructor(deviceId) {
    super(`设备 ${deviceId} 未找到`, deviceId, 'DEVICE_NOT_FOUND');
    this.statusCode = 404;
  }
}

/**
 * 设备连接错误
 *
 * @class DeviceConnectionError
 * @extends DeviceError
 */
class DeviceConnectionError extends DeviceError {
  /**
   * @param {string} deviceId - 设备ID
   * @param {string} reason - 连接失败原因
   */
  constructor(deviceId, reason) {
    super(`设备 ${deviceId} 连接失败: ${reason}`, deviceId, 'DEVICE_CONNECTION_ERROR');
    this.reason = reason;
  }
}

/**
 * 设备命令错误
 *
 * @class DeviceCommandError
 * @extends DeviceError
 */
class DeviceCommandError extends DeviceError {
  /**
   * @param {string} deviceId - 设备ID
   * @param {string} command - 命令名称
   * @param {string} reason - 失败原因
   */
  constructor(deviceId, command, reason) {
    super(`设备 ${deviceId} 执行命令 ${command} 失败: ${reason}`, deviceId, 'DEVICE_COMMAND_ERROR');
    this.command = command;
    this.reason = reason;
  }
}

/**
 * 设备超时错误
 *
 * @class DeviceTimeoutError
 * @extends DeviceError
 */
class DeviceTimeoutError extends DeviceError {
  /**
   * @param {string} deviceId - 设备ID
   * @param {number} timeout - 超时时间（毫秒）
   */
  constructor(deviceId, timeout) {
    super(`设备 ${deviceId} 操作超时 (${timeout}ms)`, deviceId, 'DEVICE_TIMEOUT');
    this.timeout = timeout;
    this.statusCode = 408;
  }
}

/**
 * 设备离线错误
 *
 * @class DeviceOfflineError
 * @extends DeviceError
 */
class DeviceOfflineError extends DeviceError {
  constructor(deviceId) {
    super(`设备 ${deviceId} 离线`, deviceId, 'DEVICE_OFFLINE');
    this.statusCode = 503;
  }
}

module.exports = {
  DeviceError,
  DeviceNotFoundError,
  DeviceConnectionError,
  DeviceCommandError,
  DeviceTimeoutError,
  DeviceOfflineError
};
