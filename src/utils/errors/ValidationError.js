const BaseError = require('./BaseError');

/**
 * 验证错误
 *
 * @class ValidationError
 * @extends BaseError
 */
class ValidationError extends BaseError {
  /**
   * @param {string} message - 错误消息
   * @param {string} [field] - 字段名称
   * @param {*} [value] - 字段值
   */
  constructor(message, field = null, value = null) {
    super(message, 'VALIDATION_ERROR', 400, { field, value });
    this.field = field;
    this.value = value;
  }
}

/**
 * 参数缺失错误
 *
 * @class MissingParameterError
 * @extends ValidationError
 */
class MissingParameterError extends ValidationError {
  constructor(parameterName) {
    super(`缺少必需参数: ${parameterName}`, parameterName);
    this.code = 'MISSING_PARAMETER';
  }
}

/**
 * 参数无效错误
 *
 * @class InvalidParameterError
 * @extends ValidationError
 */
class InvalidParameterError extends ValidationError {
  /**
   * @param {string} parameterName - 参数名称
   * @param {*} value - 无效值
   * @param {string} [reason] - 原因
   */
  constructor(parameterName, value, reason = '') {
    super(
      `参数 ${parameterName} 无效${reason ? ': ' + reason : ''}`,
      parameterName,
      value
    );
    this.code = 'INVALID_PARAMETER';
  }
}

/**
 * 参数范围错误
 *
 * @class ParameterOutOfRangeError
 * @extends ValidationError
 */
class ParameterOutOfRangeError extends ValidationError {
  /**
   * @param {string} parameterName - 参数名称
   * @param {*} value - 实际值
   * @param {number} min - 最小值
   * @param {number} max - 最大值
   */
  constructor(parameterName, value, min, max) {
    super(
      `参数 ${parameterName} 超出范围: ${value}（有效范围: ${min}-${max}）`,
      parameterName,
      value
    );
    this.code = 'PARAMETER_OUT_OF_RANGE';
    this.min = min;
    this.max = max;
  }
}

/**
 * 重复错误
 *
 * @class DuplicateError
 * @extends ValidationError
 */
class DuplicateError extends ValidationError {
  /**
   * @param {string} resourceType - 资源类型
   * @param {string} field - 重复的字段
   * @param {*} value - 重复的值
   */
  constructor(resourceType, field, value) {
    super(`${resourceType} 的 ${field} 已存在: ${value}`, field, value);
    this.code = 'DUPLICATE_ERROR';
    this.statusCode = 409;
    this.resourceType = resourceType;
  }
}

module.exports = {
  ValidationError,
  MissingParameterError,
  InvalidParameterError,
  ParameterOutOfRangeError,
  DuplicateError
};
