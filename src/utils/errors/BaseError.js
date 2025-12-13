/**
 * 基础错误类
 * 所有自定义错误的基类
 *
 * @class BaseError
 * @extends Error
 *
 * @example
 * throw new BaseError('Something went wrong', 'INTERNAL_ERROR', 500);
 */
class BaseError extends Error {
  /**
   * @param {string} message - 错误消息
   * @param {string} code - 错误代码
   * @param {number} [statusCode=500] - HTTP 状态码
   * @param {Object} [metadata] - 附加元数据
   */
  constructor(message, code, statusCode = 500, metadata = {}) {
    super(message);

    // 设置错误名称为类名
    this.name = this.constructor.name;

    // 错误代码
    this.code = code;

    // HTTP 状态码
    this.statusCode = statusCode;

    // 时间戳
    this.timestamp = new Date().toISOString();

    // 附加元数据
    this.metadata = metadata;

    // 捕获堆栈跟踪
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * 转换为 JSON 对象
   *
   * @returns {Object} JSON 对象
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
      metadata: this.metadata
    };
  }

  /**
   * 转换为字符串
   *
   * @returns {string} 错误字符串
   */
  toString() {
    return `[${this.code}] ${this.message}`;
  }

  /**
   * 检查是否是指定类型的错误
   *
   * @param {string} code - 错误代码
   * @returns {boolean} 是否匹配
   */
  is(code) {
    return this.code === code;
  }
}

module.exports = BaseError;
