const BaseError = require('../utils/errors/BaseError');
const LoggerFactory = require('../services/logging/LoggerFactory');

/**
 * 错误处理中间件
 * 统一处理所有错误，提供标准化的错误日志和响应
 *
 * @class ErrorHandler
 *
 * @example
 * try {
 *   await someOperation();
 * } catch (error) {
 *   const handled = ErrorHandler.handle(error, 'YeelightService');
 *   return handled;
 * }
 */
class ErrorHandler {
  /**
   * 错误处理器的日志记录器
   * @private
   * @static
   */
  static logger = LoggerFactory.getLogger('ErrorHandler');

  /**
   * 处理错误
   *
   * @static
   * @param {Error} error - 错误对象
   * @param {string} [context] - 错误上下文（类名、方法名等）
   * @param {Object} [additionalData] - 附加数据
   * @returns {Object} 标准化的错误对象
   *
   * @example
   * const result = ErrorHandler.handle(error, 'YeelightService.togglePower', { deviceId });
   */
  static handle(error, context = 'Unknown', additionalData = {}) {
    // 如果是自定义错误（BaseError 子类）
    if (error instanceof BaseError) {
      this.logger.error(
        `[${context}] ${error.code}: ${error.message}`,
        {
          code: error.code,
          statusCode: error.statusCode,
          metadata: error.metadata,
          additionalData,
          stack: error.stack
        }
      );

      return error.toJSON();
    }

    // 如果是普通错误
    this.logger.error(
      `[${context}] 未处理的错误: ${error.message}`,
      {
        error: error.toString(),
        additionalData,
        stack: error.stack
      }
    );

    return {
      name: 'UnhandledError',
      code: 'INTERNAL_ERROR',
      message: error.message,
      statusCode: 500,
      timestamp: new Date().toISOString(),
      context
    };
  }

  /**
   * 包装异步函数，自动处理错误
   *
   * @static
   * @param {Function} fn - 异步函数
   * @param {string} [context] - 错误上下文
   * @returns {Function} 包装后的函数
   *
   * @example
   * const safeFunction = ErrorHandler.wrap(async () => {
   *   await riskyOperation();
   * }, 'MyService.riskyOperation');
   *
   * await safeFunction();
   */
  static wrap(fn, context = 'Unknown') {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        return this.handle(error, context, { args });
      }
    };
  }

  /**
   * IPC 错误处理包装器
   * 专门用于 Electron IPC 处理器
   *
   * @static
   * @param {Function} handler - IPC 处理函数
   * @param {string} channel - IPC 通道名称
   * @returns {Function} 包装后的处理器
   *
   * @example
   * ipcMain.handle('some-channel', ErrorHandler.wrapIPC(async (event, arg) => {
   *   return await someOperation(arg);
   * }, 'some-channel'));
   */
  static wrapIPC(handler, channel) {
    return async (event, ...args) => {
      try {
        return await handler(event, ...args);
      } catch (error) {
        const handled = this.handle(error, `IPC:${channel}`, { args });

        // 对于 IPC，返回包含错误标记的对象
        return {
          success: false,
          error: handled
        };
      }
    };
  }

  /**
   * 判断错误是否可恢复
   *
   * @static
   * @param {Error} error - 错误对象
   * @returns {boolean} 是否可恢复
   */
  static isRecoverable(error) {
    if (!(error instanceof BaseError)) {
      return false;
    }

    // 某些错误类型是可恢复的
    const recoverableCodes = [
      'DEVICE_TIMEOUT',
      'DEVICE_OFFLINE',
      'TOKEN_EXPIRED',
      'NETWORK_ERROR'
    ];

    return recoverableCodes.includes(error.code);
  }

  /**
   * 判断是否应该重试
   *
   * @static
   * @param {Error} error - 错误对象
   * @returns {boolean} 是否应该重试
   */
  static shouldRetry(error) {
    if (!(error instanceof BaseError)) {
      return false;
    }

    // 某些错误可以重试
    const retryableCodes = [
      'DEVICE_TIMEOUT',
      'DEVICE_CONNECTION_ERROR',
      'NETWORK_ERROR'
    ];

    return retryableCodes.includes(error.code);
  }

  /**
   * 获取用户友好的错误消息
   *
   * @static
   * @param {Error} error - 错误对象
   * @returns {string} 用户友好的消息
   */
  static getUserMessage(error) {
    if (error instanceof BaseError) {
      // 自定义错误使用原消息
      return error.message;
    }

    // 通用错误返回友好消息
    return '操作失败，请稍后重试';
  }

  /**
   * 错误分类统计
   * @private
   * @static
   */
  static errorStats = {
    byCode: new Map(),
    byContext: new Map(),
    total: 0
  };

  /**
   * 记录错误统计
   * @private
   * @static
   */
  static recordStats(error, context) {
    this.errorStats.total++;

    // 按错误代码统计
    const code = error.code || 'UNKNOWN';
    this.errorStats.byCode.set(code, (this.errorStats.byCode.get(code) || 0) + 1);

    // 按上下文统计
    this.errorStats.byContext.set(context, (this.errorStats.byContext.get(context) || 0) + 1);
  }

  /**
   * 获取错误统计信息
   *
   * @static
   * @returns {Object} 统计信息
   */
  static getStats() {
    return {
      total: this.errorStats.total,
      byCode: Object.fromEntries(this.errorStats.byCode),
      byContext: Object.fromEntries(this.errorStats.byContext)
    };
  }

  /**
   * 重置错误统计
   *
   * @static
   */
  static resetStats() {
    this.errorStats = {
      byCode: new Map(),
      byContext: new Map(),
      total: 0
    };
  }
}

module.exports = ErrorHandler;
