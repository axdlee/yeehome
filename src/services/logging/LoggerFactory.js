const Logger = require('./Logger');

/**
 * 日志工厂
 * 管理和创建日志记录器实例
 *
 * @class LoggerFactory
 *
 * @example
 * const logger = LoggerFactory.getLogger('YeelightService');
 * logger.info('开始发现设备');
 */
class LoggerFactory {
  /**
   * 日志记录器缓存
   * @private
   * @static
   */
  static loggers = new Map();

  /**
   * 全局日志配置
   * @private
   * @static
   */
  static globalConfig = {
    level: process.env.LOG_LEVEL || 'info',
    writeToFile: true,
    sanitize: true
  };

  /**
   * 获取日志记录器实例
   *
   * @static
   * @param {string} name - 日志记录器名称
   * @param {Object} [options] - 可选配置（覆盖全局配置）
   * @returns {Logger} 日志记录器实例
   *
   * @example
   * const logger = LoggerFactory.getLogger('YeelightService');
   * logger.info('设备发现完成', { count: devices.length });
   */
  static getLogger(name, options = {}) {
    // 检查缓存
    if (this.loggers.has(name)) {
      return this.loggers.get(name);
    }

    // 合并全局配置和局部配置
    const config = {
      ...this.globalConfig,
      ...options
    };

    // 创建新的日志记录器
    const logger = new Logger(name, config);

    // 缓存
    this.loggers.set(name, logger);

    return logger;
  }

  /**
   * 设置全局日志级别
   *
   * @static
   * @param {string} level - 日志级别（error、warn、info、debug）
   */
  static setGlobalLevel(level) {
    this.globalConfig.level = level;

    // 更新所有已创建的日志记录器
    for (const logger of this.loggers.values()) {
      logger.setLevel(level);
    }
  }

  /**
   * 设置全局配置
   *
   * @static
   * @param {Object} config - 全局配置
   */
  static setGlobalConfig(config) {
    this.globalConfig = {
      ...this.globalConfig,
      ...config
    };
  }

  /**
   * 获取所有日志记录器
   *
   * @static
   * @returns {Map<string, Logger>} 日志记录器 Map
   */
  static getAllLoggers() {
    return new Map(this.loggers);
  }

  /**
   * 清理所有日志记录器的旧日志文件
   *
   * @static
   * @param {number} daysToKeep - 保留天数（默认7天）
   */
  static cleanupAllOldLogs(daysToKeep = 7) {
    // 只需要清理一次即可（所有 logger 共享同一个日志目录）
    if (this.loggers.size > 0) {
      const anyLogger = this.loggers.values().next().value;
      anyLogger.cleanupOldLogs(daysToKeep);
    }
  }

  /**
   * 销毁所有日志记录器
   *
   * @static
   */
  static destroyAll() {
    this.loggers.clear();
    console.log('LoggerFactory: 所有日志记录器已销毁');
  }

  /**
   * 获取日志统计信息
   *
   * @static
   * @returns {Object} 统计信息
   */
  static getStats() {
    return {
      totalLoggers: this.loggers.size,
      globalLevel: this.globalConfig.level,
      writeToFile: this.globalConfig.writeToFile,
      sanitize: this.globalConfig.sanitize,
      loggers: Array.from(this.loggers.keys())
    };
  }
}

module.exports = LoggerFactory;
