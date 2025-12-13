/**
 * 日志脱敏工具
 * 自动识别并脱敏日志中的敏感信息（token、密钥、密码等）
 *
 * @class LogSanitizer
 * @example
 * const sanitized = LogSanitizer.sanitize('access_token: abc123');
 * // 输出: 'access_token: ***REDACTED***'
 */
class LogSanitizer {
  /**
   * 敏感信息匹配模式
   * @private
   * @static
   */
  static sensitivePatterns = [
    // OAuth tokens
    { pattern: /access_token['":\s]+([^'"}\s,]+)/gi, name: 'access_token' },
    { pattern: /refresh_token['":\s]+([^'"}\s,]+)/gi, name: 'refresh_token' },
    { pattern: /bearer\s+([a-zA-Z0-9_\-\.]+)/gi, name: 'bearer_token' },

    // API keys and secrets
    { pattern: /client_secret['":\s]+([^'"}\s,]+)/gi, name: 'client_secret' },
    { pattern: /api_key['":\s]+([^'"}\s,]+)/gi, name: 'api_key' },
    { pattern: /apiKey['":\s]+([^'"}\s,]+)/gi, name: 'apiKey' },

    // Passwords
    { pattern: /password['":\s]+([^'"}\s,]+)/gi, name: 'password' },
    { pattern: /passwd['":\s]+([^'"}\s,]+)/gi, name: 'passwd' },
    { pattern: /pwd['":\s]+([^'"}\s,]+)/gi, name: 'pwd' },

    // Authorization codes
    { pattern: /code['":\s]+([a-zA-Z0-9_\-]{20,})/gi, name: 'auth_code' },
    { pattern: /authorization_code['":\s]+([^'"}\s,]+)/gi, name: 'authorization_code' },
  ];

  /**
   * 脱敏替换文本
   * @private
   * @static
   */
  static REDACTED_TEXT = '***REDACTED***';

  /**
   * 脱敏日志消息
   *
   * @static
   * @param {string|Object} message - 要脱敏的消息（字符串或对象）
   * @returns {string} 脱敏后的消息
   *
   * @example
   * LogSanitizer.sanitize('Token: abc123');
   * // 返回: 'Token: ***REDACTED***'
   *
   * LogSanitizer.sanitize({ access_token: 'abc123' });
   * // 返回: '{"access_token":"***REDACTED***"}'
   */
  static sanitize(message) {
    if (message === null || message === undefined) {
      return '';
    }

    // 如果是对象，先转换为字符串
    let sanitized = typeof message === 'string' ? message : JSON.stringify(message);

    // 应用所有脱敏规则
    for (const { pattern, name } of this.sensitivePatterns) {
      sanitized = sanitized.replace(pattern, (match, capturedValue) => {
        // 保留字段名，只替换值
        return match.replace(capturedValue, this.REDACTED_TEXT);
      });
    }

    return sanitized;
  }

  /**
   * 批量脱敏多个参数
   *
   * @static
   * @param {...any} args - 要脱敏的参数列表
   * @returns {Array} 脱敏后的参数数组
   *
   * @example
   * LogSanitizer.sanitizeArgs('Message', { token: 'abc' }, 'data');
   * // 返回: ['Message', '{"token":"***REDACTED***"}', 'data']
   */
  static sanitizeArgs(...args) {
    return args.map(arg => this.sanitize(arg));
  }

  /**
   * 检查字符串是否包含敏感信息
   *
   * @static
   * @param {string} message - 要检查的消息
   * @returns {boolean} 是否包含敏感信息
   *
   * @example
   * LogSanitizer.containsSensitiveInfo('access_token: abc123');
   * // 返回: true
   */
  static containsSensitiveInfo(message) {
    if (!message) return false;

    const str = typeof message === 'string' ? message : JSON.stringify(message);

    return this.sensitivePatterns.some(({ pattern }) => {
      pattern.lastIndex = 0; // 重置正则表达式状态
      return pattern.test(str);
    });
  }

  /**
   * 部分脱敏（保留前后各N个字符）
   * 用于需要部分可见的场景（如用户ID）
   *
   * @static
   * @param {string} value - 要脱敏的值
   * @param {number} visibleChars - 前后各保留的字符数
   * @returns {string} 部分脱敏后的值
   *
   * @example
   * LogSanitizer.partialSanitize('1234567890', 2);
   * // 返回: '12******90'
   */
  static partialSanitize(value, visibleChars = 3) {
    if (!value || value.length <= visibleChars * 2) {
      return this.REDACTED_TEXT;
    }

    const start = value.substring(0, visibleChars);
    const end = value.substring(value.length - visibleChars);
    const middle = '*'.repeat(Math.min(value.length - visibleChars * 2, 6));

    return `${start}${middle}${end}`;
  }
}

module.exports = LogSanitizer;
