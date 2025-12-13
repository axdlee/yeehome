const BaseError = require('./BaseError');

/**
 * 认证相关错误基类
 *
 * @class AuthError
 * @extends BaseError
 */
class AuthError extends BaseError {
  constructor(message, code = 'AUTH_ERROR') {
    super(message, code, 401);
  }
}

/**
 * Token 过期错误
 *
 * @class TokenExpiredError
 * @extends AuthError
 */
class TokenExpiredError extends AuthError {
  constructor() {
    super('访问令牌已过期', 'TOKEN_EXPIRED');
  }
}

/**
 * Token 无效错误
 *
 * @class InvalidTokenError
 * @extends AuthError
 */
class InvalidTokenError extends AuthError {
  constructor(reason = '') {
    super(`访问令牌无效${reason ? ': ' + reason : ''}`, 'INVALID_TOKEN');
  }
}

/**
 * 未认证错误
 *
 * @class NotAuthenticatedError
 * @extends AuthError
 */
class NotAuthenticatedError extends AuthError {
  constructor() {
    super('未认证，请先登录', 'NOT_AUTHENTICATED');
  }
}

/**
 * CSRF 错误
 *
 * @class CSRFError
 * @extends AuthError
 */
class CSRFError extends AuthError {
  /**
   * @param {string} [reason] - 失败原因
   */
  constructor(reason = 'Invalid or expired CSRF token') {
    super(reason, 'CSRF_ERROR');
    this.statusCode = 403;
  }
}

/**
 * OAuth 错误
 *
 * @class OAuthError
 * @extends AuthError
 */
class OAuthError extends AuthError {
  /**
   * @param {string} message - 错误消息
   * @param {string} [oauthErrorCode] - OAuth 错误代码
   */
  constructor(message, oauthErrorCode = null) {
    super(message, 'OAUTH_ERROR');
    this.oauthErrorCode = oauthErrorCode;
  }
}

/**
 * 权限不足错误
 *
 * @class PermissionDeniedError
 * @extends AuthError
 */
class PermissionDeniedError extends AuthError {
  /**
   * @param {string} [resource] - 资源名称
   */
  constructor(resource = '') {
    super(`权限不足${resource ? ': ' + resource : ''}`, 'PERMISSION_DENIED');
    this.statusCode = 403;
    this.resource = resource;
  }
}

module.exports = {
  AuthError,
  TokenExpiredError,
  InvalidTokenError,
  NotAuthenticatedError,
  CSRFError,
  OAuthError,
  PermissionDeniedError
};
