const fs = require('fs');
const path = require('path');
const { app, safeStorage } = require('electron');
const crypto = require('crypto');
const LogSanitizer = require('./LogSanitizer');

/**
 * 安全配置管理器
 * 使用 Electron safeStorage API 加密存储敏感配置
 * 优先级：环境变量 > 加密存储 > 配置文件
 *
 * @class SecureConfigManager
 * @example
 * const configManager = new SecureConfigManager();
 * const secret = configManager.getSensitiveConfig('oauth.clientSecret');
 */
class SecureConfigManager {
  /**
   * 定义敏感配置键（这些配置应加密存储）
   * @private
   * @static
   */
  static SENSITIVE_KEYS = [
    'oauth.clientSecret',
    'oauth.clientId',
    'cloudService.apiKey',
  ];

  /**
   * 环境变量映射
   * @private
   * @static
   */
  static ENV_VAR_MAP = {
    'oauth.clientSecret': 'YEELIGHT_CLIENT_SECRET',
    'oauth.clientId': 'YEELIGHT_CLIENT_ID',
    'cloudService.apiKey': 'YEELIGHT_API_KEY',
  };

  constructor() {
    // 使用 Electron 的 userData 目录
    const userDataPath = app.getPath('userData');
    this.secureStoragePath = path.join(userDataPath, 'secure');
    this.secureConfigPath = path.join(this.secureStoragePath, 'sensitive.enc');

    // 确保目录存在
    this.ensureSecureDirectory();

    // 加载敏感配置
    this.sensitiveConfig = this.loadSensitiveConfig();
  }

  /**
   * 确保安全存储目录存在
   * @private
   */
  ensureSecureDirectory() {
    if (!fs.existsSync(this.secureStoragePath)) {
      fs.mkdirSync(this.secureStoragePath, { recursive: true, mode: 0o700 });
    }
  }

  /**
   * 加载敏感配置
   * @private
   * @returns {Object} 敏感配置对象
   */
  loadSensitiveConfig() {
    try {
      if (fs.existsSync(this.secureConfigPath)) {
        const encryptedData = fs.readFileSync(this.secureConfigPath);

        // 使用 safeStorage 解密
        if (safeStorage.isEncryptionAvailable()) {
          const decrypted = safeStorage.decryptString(encryptedData);
          return JSON.parse(decrypted);
        } else {
          console.warn('SecureConfigManager: 加密功能不可用，使用明文存储（仅开发环境）');
          return JSON.parse(encryptedData.toString());
        }
      }
    } catch (error) {
      console.error('SecureConfigManager: 加载敏感配置失败:', error.message);
    }

    return {};
  }

  /**
   * 保存敏感配置
   * @private
   */
  saveSensitiveConfig() {
    try {
      const jsonData = JSON.stringify(this.sensitiveConfig, null, 2);

      let dataToWrite;
      if (safeStorage.isEncryptionAvailable()) {
        // 加密存储
        dataToWrite = safeStorage.encryptString(jsonData);
      } else {
        // 开发环境降级为明文（生产环境应拒绝）
        if (process.env.NODE_ENV === 'production') {
          throw new Error('生产环境必须使用加密存储');
        }
        console.warn('SecureConfigManager: 加密功能不可用，使用明文存储（仅开发环境）');
        dataToWrite = Buffer.from(jsonData);
      }

      // 写入文件，设置权限为仅所有者可读写
      fs.writeFileSync(this.secureConfigPath, dataToWrite, { mode: 0o600 });
      console.log('SecureConfigManager: 敏感配置已保存');
    } catch (error) {
      console.error('SecureConfigManager: 保存敏感配置失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取敏感配置项
   * 优先级：环境变量 > 加密存储 > null
   *
   * @param {string} key - 配置项键名（支持点分隔符）
   * @param {*} defaultValue - 默认值
   * @returns {*} 配置项值
   *
   * @example
   * const secret = configManager.getSensitiveConfig('oauth.clientSecret');
   */
  getSensitiveConfig(key, defaultValue = null) {
    // 1. 优先从环境变量读取
    const envVar = SecureConfigManager.ENV_VAR_MAP[key];
    if (envVar && process.env[envVar]) {
      return process.env[envVar];
    }

    // 2. 从加密存储读取
    const keys = key.split('.');
    let value = this.sensitiveConfig;

    for (const k of keys) {
      if (value[k] === undefined) {
        return defaultValue;
      }
      value = value[k];
    }

    return value;
  }

  /**
   * 设置敏感配置项
   *
   * @param {string} key - 配置项键名（支持点分隔符）
   * @param {*} value - 配置项值
   *
   * @example
   * configManager.setSensitiveConfig('oauth.clientSecret', 'secret123');
   */
  setSensitiveConfig(key, value) {
    const keys = key.split('.');
    let config = this.sensitiveConfig;

    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!config[k]) {
        config[k] = {};
      }
      config = config[k];
    }

    config[keys[keys.length - 1]] = value;

    // 保存到加密文件
    this.saveSensitiveConfig();
  }

  /**
   * 检查配置键是否为敏感配置
   *
   * @static
   * @param {string} key - 配置项键名
   * @returns {boolean} 是否为敏感配置
   */
  static isSensitiveKey(key) {
    return this.SENSITIVE_KEYS.includes(key);
  }

  /**
   * 删除敏感配置项
   *
   * @param {string} key - 配置项键名
   */
  deleteSensitiveConfig(key) {
    const keys = key.split('.');
    let config = this.sensitiveConfig;

    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!config[k]) {
        return; // 路径不存在，直接返回
      }
      config = config[k];
    }

    delete config[keys[keys.length - 1]];

    // 保存更改
    this.saveSensitiveConfig();
  }

  /**
   * 清空所有敏感配置
   */
  clearAllSensitiveConfig() {
    this.sensitiveConfig = {};
    this.saveSensitiveConfig();
    console.log('SecureConfigManager: 所有敏感配置已清空');
  }

  /**
   * 检查敏感配置是否完整
   *
   * @returns {boolean} 配置是否完整
   */
  isSensitiveConfigComplete() {
    const clientId = this.getSensitiveConfig('oauth.clientId');
    const clientSecret = this.getSensitiveConfig('oauth.clientSecret');

    return !!(clientId && clientSecret);
  }

  /**
   * 获取脱敏后的敏感配置（用于日志输出）
   *
   * @returns {Object} 脱敏后的配置对象
   */
  getSanitizedConfig() {
    const sanitized = {};

    const traverse = (obj, result, prefix = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;

        if (typeof value === 'object' && value !== null) {
          result[key] = {};
          traverse(value, result[key], fullKey);
        } else {
          // 脱敏敏感值
          result[key] = LogSanitizer.partialSanitize(String(value), 2);
        }
      }
    };

    traverse(this.sensitiveConfig, sanitized);
    return sanitized;
  }

  /**
   * 导出敏感配置（用于备份，需要手动加密）
   * ⚠️ 警告：导出的数据是明文，需要安全处理
   *
   * @param {string} exportPath - 导出文件路径
   * @throws {Error} 如果在生产环境调用
   */
  exportSensitiveConfig(exportPath) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('生产环境禁止导出敏感配置');
    }

    const jsonData = JSON.stringify(this.sensitiveConfig, null, 2);
    fs.writeFileSync(exportPath, jsonData, { mode: 0o600 });
    console.warn('SecureConfigManager: 敏感配置已导出（明文），请妥善保管');
  }

  /**
   * 导入敏感配置（从备份恢复）
   *
   * @param {string} importPath - 导入文件路径
   */
  importSensitiveConfig(importPath) {
    try {
      const jsonData = fs.readFileSync(importPath, 'utf8');
      this.sensitiveConfig = JSON.parse(jsonData);
      this.saveSensitiveConfig();
      console.log('SecureConfigManager: 敏感配置已导入');
    } catch (error) {
      console.error('SecureConfigManager: 导入敏感配置失败:', error.message);
      throw error;
    }
  }
}

module.exports = SecureConfigManager;
