const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');
const { app, safeStorage } = require('electron');
const ConfigManager = require('./ConfigManager');
const SecureConfigManager = require('./security/SecureConfigManager');
const LogSanitizer = require('./security/LogSanitizer');

class OAuthManager extends EventEmitter {
  constructor() {
    super();
    // 使用Electron的userData目录作为数据存储位置
    const userDataPath = app.getPath('userData');
    this.dataPath = path.join(userDataPath, 'data');
    this.tokenFilePath = path.join(this.dataPath, 'oauth_tokens.json');

    // 创建配置管理器
    this.configManager = new ConfigManager();
    this.secureConfigManager = new SecureConfigManager();

    this.tokens = null;
    this.isRefreshing = false;
    this.refreshCallbacks = [];

    // CSRF 防护：存储待验证的 state 参数
    this.pendingStates = new Map(); // state -> { timestamp, data }
    this.stateCleanupInterval = setInterval(() => this.cleanupExpiredStates(), 60000); // 每分钟清理一次

    // 确保数据目录存在
    this.ensureDataDirectory();

    // 加载token数据
    this.loadTokens();
  }
  
  /**
   * 确保数据目录存在
   */
  ensureDataDirectory() {
    if (!fs.existsSync(this.dataPath)) {
      fs.mkdirSync(this.dataPath, { recursive: true });
    }
  }
  
  /**
   * 从文件加载token数据
   */
  loadTokens() {
    try {
      if (fs.existsSync(this.tokenFilePath)) {
        const encryptedData = fs.readFileSync(this.tokenFilePath);
        if (safeStorage.isEncryptionAvailable()) {
          // 使用safeStorage解密数据
          const decryptedData = safeStorage.decryptString(encryptedData);
          this.tokens = JSON.parse(decryptedData);
        } else {
          // 加密不可用，直接读取（仅开发环境）
          this.tokens = JSON.parse(encryptedData.toString());
        }
        console.log('已加载OAuth token数据');

        // 检查token是否即将过期，提前刷新
        this.checkAndRefreshToken();
      }
    } catch (error) {
      console.error('加载OAuth token数据错误:', LogSanitizer.sanitize(error.message));
      this.tokens = null;
    }
  }

  /**
   * 生成加密安全的随机 state 参数（用于 CSRF 防护）
   * @param {Object} [additionalData] - 可选的附加数据
   * @returns {string} 随机 state 字符串
   */
  generateState(additionalData = {}) {
    // 使用 crypto.randomBytes 生成加密安全的随机数
    const state = crypto.randomBytes(32).toString('hex');

    // 存储 state 及其创建时间
    this.pendingStates.set(state, {
      timestamp: Date.now(),
      data: additionalData
    });

    // 10分钟后自动清理
    setTimeout(() => this.pendingStates.delete(state), 10 * 60 * 1000);

    return state;
  }

  /**
   * 验证 state 参数（CSRF 防护）
   * @param {string} state - 待验证的 state 参数
   * @returns {Object|null} 如果验证通过返回关联的数据，否则返回 null
   * @throws {Error} 如果 state 无效或已过期
   */
  validateState(state) {
    if (!state) {
      throw new Error('State parameter is missing');
    }

    if (!this.pendingStates.has(state)) {
      throw new Error('Invalid or expired CSRF token (state)');
    }

    const stateData = this.pendingStates.get(state);
    const now = Date.now();
    const stateAge = now - stateData.timestamp;

    // state 有效期：10分钟
    if (stateAge > 10 * 60 * 1000) {
      this.pendingStates.delete(state);
      throw new Error('CSRF token (state) has expired');
    }

    // 验证成功，删除已使用的 state（一次性使用）
    this.pendingStates.delete(state);

    return stateData.data;
  }

  /**
   * 清理过期的 state 参数
   * @private
   */
  cleanupExpiredStates() {
    const now = Date.now();
    const expireTime = 10 * 60 * 1000; // 10分钟

    for (const [state, data] of this.pendingStates.entries()) {
      if (now - data.timestamp > expireTime) {
        this.pendingStates.delete(state);
      }
    }
  }
  
  /**
   * 保存token数据到文件
   */
  saveTokens() {
    try {
      if (this.tokens) {
        const tokenData = JSON.stringify(this.tokens, null, 2);
        let dataToWrite;
        
        if (safeStorage.isEncryptionAvailable()) {
          // 使用safeStorage加密数据
          dataToWrite = safeStorage.encryptString(tokenData);
          // 直接写入Buffer
          fs.writeFileSync(this.tokenFilePath, dataToWrite);
        } else {
          // 加密不可用，直接写入明文（仅开发环境）
          dataToWrite = tokenData;
          fs.writeFileSync(this.tokenFilePath, dataToWrite, 'utf8');
        }
        console.log('OAuth token数据已保存');
      }
    } catch (error) {
      console.error('保存OAuth token数据错误:', error);
    }
  }
  
  /**
   * 获取授权URL
   * @param {string} [state] - 可选的 state 参数，如果不提供将自动生成加密安全的随机值
   * @returns {string} 授权URL
   */
  getAuthorizationUrl(state) {
    const clientId = this.configManager.getConfig('oauth.clientId', '') ||
                     this.secureConfigManager.getSensitiveConfig('oauth.clientId', '');
    const redirectUri = this.configManager.getConfig('oauth.redirectUri', 'http://localhost:3000/callback');
    const scope = this.configManager.getConfig('oauth.scope', 'read write');
    const authorizationUrl = this.configManager.getConfig('oauth.authorizationUrl', '');

    // 如果未提供 state，生成一个加密安全的随机 state
    const csrfState = state || this.generateState();

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scope,
      state: csrfState,
      skip_confirm: 'true'
    });

    return `${authorizationUrl}?${params.toString()}`;
  }
  
  /**
   * 使用授权码换取访问令牌
   * @param {string} code - 授权码
   * @param {string} [state] - 可选的 state 参数（用于验证 CSRF）
   * @returns {Promise<Object>} 包含access_token和refresh_token的对象
   */
  async getAccessToken(code, state = null) {
    try {
      // 如果提供了 state，进行 CSRF 验证
      if (state) {
        this.validateState(state);
      }

      const tokenUrl = this.configManager.getConfig('oauth.tokenUrl', '');
      const clientId = this.configManager.getConfig('oauth.clientId', '') ||
                       this.secureConfigManager.getSensitiveConfig('oauth.clientId', '');
      const clientSecret = this.secureConfigManager.getSensitiveConfig('oauth.clientSecret', '') ||
                           this.configManager.getConfig('oauth.clientSecret', '');
      const redirectUri = this.configManager.getConfig('oauth.redirectUri', 'http://localhost:3000/callback');

      const response = await axios.post(tokenUrl, {
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        code: code
      });

      const tokenData = response.data;

      // 保存token数据
      this.tokens = {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_type: tokenData.token_type,
        expires_in: tokenData.expires_in,
        scope: tokenData.scope,
        id: tokenData.id,
        region: tokenData.region,
        device: tokenData.device,
        client_id: tokenData.client_id,
        username: tokenData.username,
        jti: tokenData.jti,
        expires_at: Date.now() + (tokenData.expires_in * 1000) // 计算过期时间
      };

      // 保存到文件
      this.saveTokens();

      // 触发认证成功事件
      this.emit('authenticated', this.tokens);

      return this.tokens;
    } catch (error) {
      const sanitizedError = LogSanitizer.sanitize(error.response ? error.response.data : error.message);
      console.error('获取access_token错误:', sanitizedError);
      throw error;
    }
  }
  
  /**
   * 使用refresh_token刷新access_token
   * @returns {Promise<Object>} 包含新access_token的对象
   */
  async refreshAccessToken() {
    if (!this.tokens || !this.tokens.refresh_token) {
      throw new Error('No refresh token available');
    }

    try {
      const tokenUrl = this.configManager.getConfig('oauth.tokenUrl', '');
      const clientId = this.configManager.getConfig('oauth.clientId', '') ||
                       this.secureConfigManager.getSensitiveConfig('oauth.clientId', '');
      const clientSecret = this.secureConfigManager.getSensitiveConfig('oauth.clientSecret', '') ||
                           this.configManager.getConfig('oauth.clientSecret', '');

      const response = await axios.post(tokenUrl, {
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: this.tokens.refresh_token
      });

      const tokenData = response.data;

      // 更新token数据
      this.tokens = {
        ...this.tokens,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || this.tokens.refresh_token,
        token_type: tokenData.token_type,
        expires_in: tokenData.expires_in,
        scope: tokenData.scope,
        expires_at: Date.now() + (tokenData.expires_in * 1000)
      };

      // 保存到文件
      this.saveTokens();

      // 触发token刷新成功事件
      this.emit('tokenRefreshed', this.tokens);

      return this.tokens;
    } catch (error) {
      const sanitizedError = LogSanitizer.sanitize(error.response ? error.response.data : error.message);
      console.error('刷新access_token错误:', sanitizedError);
      // 如果刷新失败，清除token
      this.clearTokens();
      this.emit('authError', error);
      throw error;
    }
  }
  
  /**
   * 检查token是否即将过期，提前刷新
   */
  checkAndRefreshToken() {
    if (!this.tokens) return;
    
    const now = Date.now();
    const expiresAt = this.tokens.expires_at;
    const refreshThreshold = 24 * 60 * 60 * 1000; // 提前24小时刷新
    
    if (expiresAt - now < refreshThreshold) {
      this.refreshAccessToken();
    }
  }
  
  /**
   * 获取当前access_token，如果即将过期则自动刷新
   * @returns {Promise<string>} 当前有效的access_token
   */
  async getCurrentToken() {
    if (!this.tokens) {
      throw new Error('Not authenticated');
    }
    
    const now = Date.now();
    const expiresAt = this.tokens.expires_at;
    
    // 如果token已过期或即将过期（5分钟内），则刷新
    if (expiresAt - now < 5 * 60 * 1000) {
      if (this.isRefreshing) {
        // 如果正在刷新，等待刷新完成
        return new Promise((resolve, reject) => {
          this.refreshCallbacks.push({ resolve, reject });
        });
      }
      
      this.isRefreshing = true;
      
      try {
        await this.refreshAccessToken();
        this.isRefreshing = false;
        
        // 通知所有等待的回调
        this.refreshCallbacks.forEach(({ resolve }) => {
          resolve(this.tokens.access_token);
        });
        this.refreshCallbacks = [];
        
        return this.tokens.access_token;
      } catch (error) {
        this.isRefreshing = false;
        
        // 通知所有等待的回调
        this.refreshCallbacks.forEach(({ reject }) => {
          reject(error);
        });
        this.refreshCallbacks = [];
        
        throw error;
      }
    }
    
    return this.tokens.access_token;
  }
  
  /**
   * 清除token数据
   */
  clearTokens() {
    this.tokens = null;
    if (fs.existsSync(this.tokenFilePath)) {
      fs.unlinkSync(this.tokenFilePath);
    }
    this.emit('logout');
  }

  /**
   * 清理资源（应用退出时调用）
   */
  cleanup() {
    // 清理定时器
    if (this.stateCleanupInterval) {
      clearInterval(this.stateCleanupInterval);
      this.stateCleanupInterval = null;
    }

    // 清空待验证的 state
    this.pendingStates.clear();

    console.log('OAuthManager: 资源已清理');
  }
  
  /**
   * 检查是否已认证
   * @returns {boolean} 是否已认证
   */
  isAuthenticated() {
    return !!this.tokens && !!this.tokens.access_token;
  }
  
  /**
   * 获取当前认证状态
   * @returns {Object|null} 当前认证状态
   */
  getAuthStatus() {
    if (!this.tokens) {
      return {
        isAuthenticated: false,
        userInfo: null
      };
    }
    
    return {
      isAuthenticated: true,
      userInfo: {
        id: this.tokens.id,
        username: this.tokens.username,
        region: this.tokens.region,
        scope: this.tokens.scope
      }
    };
  }
  
  /**
   * 设置配置信息
   * @param {Object} config - 配置信息
   */
  setConfig(config) {
    this.config = {
      ...this.config,
      ...config
    };
  }
  
  /**
   * 获取配置信息
   * @returns {Object} 配置信息
   */
  getConfig() {
    return this.config;
  }
}

module.exports = OAuthManager;
