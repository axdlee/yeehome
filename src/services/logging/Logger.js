const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const LogSanitizer = require('../security/LogSanitizer');

/**
 * 日志级别枚举
 */
const LogLevel = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

/**
 * 统一日志记录器
 * 提供分级日志、自动脱敏、文件输出等功能
 *
 * @class Logger
 *
 * @example
 * const logger = new Logger('YeelightService');
 * logger.info('开始发现设备');
 * logger.error('连接失败', { deviceId, error });
 */
class Logger {
  /**
   * @param {string} name - 日志记录器名称（通常是类名或模块名）
   * @param {Object} [options] - 可选配置
   * @param {string} [options.level] - 日志级别（error、warn、info、debug）
   * @param {boolean} [options.writeToFile] - 是否写入文件
   * @param {boolean} [options.sanitize] - 是否自动脱敏
   */
  constructor(name, options = {}) {
    this.name = name;
    this.level = this.parseLevel(options.level || process.env.LOG_LEVEL || 'info');
    this.writeToFile = options.writeToFile !== undefined ? options.writeToFile : true;
    this.sanitize = options.sanitize !== undefined ? options.sanitize : true;

    // 日志文件路径
    if (this.writeToFile) {
      const userDataPath = app.getPath('userData');
      this.logDir = path.join(userDataPath, 'logs');
      this.ensureLogDirectory();

      // 日志文件按日期分割
      const today = new Date().toISOString().split('T')[0];
      this.logFilePath = path.join(this.logDir, `app-${today}.log`);
    }
  }

  /**
   * 解析日志级别
   * @private
   */
  parseLevel(levelStr) {
    const level = levelStr.toLowerCase();
    switch (level) {
      case 'error':
        return LogLevel.ERROR;
      case 'warn':
        return LogLevel.WARN;
      case 'info':
        return LogLevel.INFO;
      case 'debug':
        return LogLevel.DEBUG;
      default:
        return LogLevel.INFO;
    }
  }

  /**
   * 确保日志目录存在
   * @private
   */
  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true, mode: 0o700 });
    }
  }

  /**
   * 记录日志
   * @private
   */
  log(level, levelName, message, ...args) {
    // 检查日志级别
    if (level > this.level) {
      return;
    }

    // 时间戳
    const timestamp = new Date().toISOString();

    // 处理消息和参数
    let processedMessage = message;
    let processedArgs = args;

    if (this.sanitize) {
      processedMessage = LogSanitizer.sanitize(message);
      processedArgs = args.map(arg => {
        if (typeof arg === 'object') {
          return LogSanitizer.sanitize(JSON.stringify(arg));
        }
        return LogSanitizer.sanitize(String(arg));
      });
    }

    // 构建日志条目
    const logEntry = {
      timestamp,
      level: levelName,
      name: this.name,
      message: processedMessage,
      args: processedArgs
    };

    // 控制台输出
    this.outputToConsole(level, logEntry);

    // 文件输出
    if (this.writeToFile) {
      this.outputToFile(logEntry);
    }
  }

  /**
   * 输出到控制台
   * @private
   */
  outputToConsole(level, logEntry) {
    const { timestamp, level: levelName, name, message, args } = logEntry;
    const prefix = `[${timestamp}] [${levelName.toUpperCase()}] [${name}]`;

    // 根据级别选择控制台方法
    switch (level) {
      case LogLevel.ERROR:
        console.error(prefix, message, ...args);
        break;
      case LogLevel.WARN:
        console.warn(prefix, message, ...args);
        break;
      case LogLevel.DEBUG:
        console.debug(prefix, message, ...args);
        break;
      default:
        console.log(prefix, message, ...args);
    }
  }

  /**
   * 输出到文件
   * @private
   */
  outputToFile(logEntry) {
    try {
      const { timestamp, level, name, message, args } = logEntry;

      // 构建日志行
      const argsStr = args.length > 0 ? ' ' + args.join(' ') : '';
      const logLine = `[${timestamp}] [${level.toUpperCase()}] [${name}] ${message}${argsStr}\n`;

      // 追加到日志文件
      fs.appendFileSync(this.logFilePath, logLine, { encoding: 'utf8', mode: 0o600 });
    } catch (error) {
      // 避免日志写入失败导致应用崩溃
      console.error('写入日志文件失败:', error.message);
    }
  }

  /**
   * 错误级别日志
   * @param {string} message - 日志消息
   * @param {...any} args - 附加参数
   */
  error(message, ...args) {
    this.log(LogLevel.ERROR, 'error', message, ...args);
  }

  /**
   * 警告级别日志
   * @param {string} message - 日志消息
   * @param {...any} args - 附加参数
   */
  warn(message, ...args) {
    this.log(LogLevel.WARN, 'warn', message, ...args);
  }

  /**
   * 信息级别日志
   * @param {string} message - 日志消息
   * @param {...any} args - 附加参数
   */
  info(message, ...args) {
    this.log(LogLevel.INFO, 'info', message, ...args);
  }

  /**
   * 调试级别日志
   * @param {string} message - 日志消息
   * @param {...any} args - 附加参数
   */
  debug(message, ...args) {
    this.log(LogLevel.DEBUG, 'debug', message, ...args);
  }

  /**
   * 设置日志级别
   * @param {string} level - 日志级别（error、warn、info、debug）
   */
  setLevel(level) {
    this.level = this.parseLevel(level);
  }

  /**
   * 获取当前日志级别
   * @returns {string} 日志级别
   */
  getLevel() {
    const levels = ['error', 'warn', 'info', 'debug'];
    return levels[this.level] || 'info';
  }

  /**
   * 清理旧日志文件
   * @param {number} daysToKeep - 保留天数（默认7天）
   */
  cleanupOldLogs(daysToKeep = 7) {
    if (!this.writeToFile) {
      return;
    }

    try {
      const files = fs.readdirSync(this.logDir);
      const now = Date.now();
      const maxAge = daysToKeep * 24 * 60 * 60 * 1000; // 转换为毫秒

      for (const file of files) {
        if (!file.startsWith('app-') || !file.endsWith('.log')) {
          continue;
        }

        const filePath = path.join(this.logDir, file);
        const stats = fs.statSync(filePath);
        const age = now - stats.mtime.getTime();

        if (age > maxAge) {
          fs.unlinkSync(filePath);
          console.log(`Logger: 已删除旧日志文件: ${file}`);
        }
      }
    } catch (error) {
      console.error('清理旧日志文件失败:', error.message);
    }
  }
}

module.exports = Logger;
