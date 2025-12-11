const fs = require('fs');
const path = require('path');

class ConfigManager {
  constructor() {
    this.configPath = path.join(__dirname, '../config');
    this.configFilePath = path.join(this.configPath, 'config.json');
    this.config = null;
    
    // 确保配置目录存在
    this.ensureConfigDirectory();
    
    // 加载配置文件
    this.loadConfig();
  }
  
  /**
   * 确保配置目录存在
   */
  ensureConfigDirectory() {
    if (!fs.existsSync(this.configPath)) {
      fs.mkdirSync(this.configPath, { recursive: true });
    }
  }
  
  /**
   * 从文件加载配置
   */
  loadConfig() {
    try {
      if (fs.existsSync(this.configFilePath)) {
        const data = fs.readFileSync(this.configFilePath, 'utf8');
        this.config = JSON.parse(data);
        console.log('已加载配置文件:', this.config);
      } else {
        // 初始化默认配置
        this.config = this.getDefaultConfig();
        this.saveConfig();
        console.log('已创建默认配置文件');
      }
    } catch (error) {
      console.error('加载配置文件错误:', error);
      // 使用默认配置
      this.config = this.getDefaultConfig();
    }
  }
  
  /**
   * 保存配置到文件
   */
  saveConfig() {
    try {
      fs.writeFileSync(this.configFilePath, JSON.stringify(this.config, null, 2), 'utf8');
      console.log('配置文件已保存');
    } catch (error) {
      console.error('保存配置文件错误:', error);
    }
  }
  
  /**
   * 获取默认配置
   * @returns {Object} 默认配置
   */
  getDefaultConfig() {
    return {
      // OAuth配置
      oauth: {
        clientId: '',
        clientSecret: '',
        authorizationUrl: '',
        tokenUrl: '',
        redirectUri: 'http://localhost:3000/callback',
        scope: 'read write'
      },
      // 云服务配置
      cloudService: {
        apiBaseUrl: '',
        autoSync: true,
        syncInterval: 30 * 60 * 1000 // 30分钟
      },
      // 本地服务配置
      localService: {
        discoverInterval: 60 * 1000 // 1分钟
      },
      // 应用配置
      app: {
        debug: false,
        theme: 'light'
      }
    };
  }
  
  /**
   * 获取配置项
   * @param {string} key - 配置项键名，支持点分隔符，如 'oauth.clientId'
   * @param {*} defaultValue - 默认值
   * @returns {*} 配置项值
   */
  getConfig(key, defaultValue = null) {
    const keys = key.split('.');
    let value = this.config;
    
    for (const k of keys) {
      if (value[k] === undefined) {
        return defaultValue;
      }
      value = value[k];
    }
    
    return value;
  }
  
  /**
   * 设置配置项
   * @param {string} key - 配置项键名，支持点分隔符，如 'oauth.clientId'
   * @param {*} value - 配置项值
   */
  setConfig(key, value) {
    const keys = key.split('.');
    let config = this.config;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!config[k]) {
        config[k] = {};
      }
      config = config[k];
    }
    
    config[keys[keys.length - 1]] = value;
    
    // 保存配置文件
    this.saveConfig();
  }
  
  /**
   * 获取完整配置
   * @returns {Object} 完整配置
   */
  getAllConfig() {
    return this.config;
  }
  
  /**
   * 重置配置到默认值
   */
  resetConfig() {
    this.config = this.getDefaultConfig();
    this.saveConfig();
    console.log('配置已重置为默认值');
  }
  
  /**
   * 检查配置是否完整
   * @returns {boolean} 配置是否完整
   */
  isConfigComplete() {
    // 检查关键配置项是否存在
    const oauthConfig = this.getConfig('oauth', {});
    return oauthConfig.clientId && oauthConfig.clientSecret && oauthConfig.authorizationUrl && oauthConfig.tokenUrl;
  }
  
  /**
   * 获取配置文件路径
   * @returns {string} 配置文件路径
   */
  getConfigFilePath() {
    return this.configFilePath;
  }
}

module.exports = ConfigManager;
