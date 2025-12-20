const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { app, safeStorage } = require('electron');
const LogSanitizer = require('./security/LogSanitizer');

/**
 * Yeelight JWT 认证管理器
 * 使用 Yeelight 官方网站的 JWT 登录 API
 */
class YeelightAuthManager extends EventEmitter {
  constructor() {
    super();

    // 使用 Electron 的 userData 目录作为数据存储位置
    const userDataPath = app.getPath('userData');
    this.dataPath = path.join(userDataPath, 'data');
    this.tokenFilePath = path.join(this.dataPath, 'yeelight_auth.json');

    // Yeelight API 端点
    this.baseUrl = 'https://user.yeelight.com';
    this.loginUrl = `${this.baseUrl}/apis/account/oauth/do_login`;
    this.tokenListUrl = `${this.baseUrl}/apis/account/jwt/token/r/list`;
    this.tokenCreateUrl = `${this.baseUrl}/apis/account/jwt/token/r/create`;
    this.tokenDeleteUrl = `${this.baseUrl}/apis/account/jwt/token/r/delete`;

    // 认证状态
    this.tokens = null;
    this.isRefreshing = false;

    // HTTP 客户端配置
    this.httpClient = axios.create({
      timeout: 30000,
      headers: {
        'accept': 'application/json, text/plain, */*',
        'accept-language': 'zh-CN,zh;q=0.9',
        'content-type': 'application/x-www-form-urlencoded',
        'origin': this.baseUrl,
        'referer': `${this.baseUrl}/login`,
        'x-requested-with': 'XMLHttpRequest',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'
      }
    });

    // 确保数据目录存在
    this.ensureDataDirectory();

    // 加载已保存的 token 数据
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
   * 从文件加载 token 数据
   */
  loadTokens() {
    try {
      if (fs.existsSync(this.tokenFilePath)) {
        const encryptedData = fs.readFileSync(this.tokenFilePath);
        if (safeStorage.isEncryptionAvailable()) {
          const decryptedData = safeStorage.decryptString(encryptedData);
          this.tokens = JSON.parse(decryptedData);
        } else {
          this.tokens = JSON.parse(encryptedData.toString());
        }
        console.log('YeelightAuthManager: 已加载认证数据');
      }
    } catch (error) {
      console.error('YeelightAuthManager: 加载认证数据错误:', LogSanitizer.sanitize(error.message));
      this.tokens = null;
    }
  }

  /**
   * 保存 token 数据到文件
   */
  saveTokens() {
    try {
      if (this.tokens) {
        const tokenData = JSON.stringify(this.tokens, null, 2);

        if (safeStorage.isEncryptionAvailable()) {
          const encryptedData = safeStorage.encryptString(tokenData);
          fs.writeFileSync(this.tokenFilePath, encryptedData);
        } else {
          fs.writeFileSync(this.tokenFilePath, tokenData, 'utf8');
        }
        console.log('YeelightAuthManager: 认证数据已保存');
      }
    } catch (error) {
      console.error('YeelightAuthManager: 保存认证数据错误:', error.message);
    }
  }

  /**
   * 使用用户名和密码登录
   * @param {string} username - 用户名/邮箱
   * @param {string} password - 密码
   * @returns {Promise<Object>} 登录结果
   */
  async login(username, password) {
    try {
      console.log('YeelightAuthManager: 开始登录...');

      // 构建登录请求
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      const response = await this.httpClient.post(this.loginUrl, formData.toString());

      if (response.data.success && response.data.code === '200') {
        const jwtAuthToken = response.data.data['jwt-auth-token'];

        // 保存 JWT Auth Token
        this.tokens = {
          jwtAuthToken,
          username,
          loginTime: Date.now(),
          accessToken: null,
          accessTokenId: null
        };

        console.log('YeelightAuthManager: 登录成功，获取 access token...');

        // 获取或创建 access token
        await this.ensureAccessToken();

        // 保存认证数据
        this.saveTokens();

        // 触发认证成功事件
        this.emit('authenticated', this.tokens);

        return {
          success: true,
          username: this.tokens.username,
          accessToken: this.tokens.accessToken
        };
      } else {
        const errorMsg = response.data.msg || '登录失败';
        console.error('YeelightAuthManager: 登录失败:', errorMsg);
        throw new Error(errorMsg);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.msg || error.message || '登录失败';
      console.error('YeelightAuthManager: 登录错误:', LogSanitizer.sanitize(errorMessage));
      this.emit('authError', new Error(errorMessage));
      throw new Error(errorMessage);
    }
  }

  /**
   * 确保有可用的 access token
   */
  async ensureAccessToken() {
    if (!this.tokens?.jwtAuthToken) {
      throw new Error('未登录');
    }

    try {
      // 先尝试获取现有的 token 列表
      const tokenList = await this.getTokenList();

      if (tokenList && tokenList.length > 0) {
        // 使用第一个可用的 token（API 返回的字段名是 accessToken）
        const firstToken = tokenList[0];
        this.tokens.accessToken = firstToken.accessToken || firstToken.token;
        this.tokens.accessTokenId = firstToken.id;
        console.log('YeelightAuthManager: 使用现有 access token');
      } else {
        // 创建新的 access token
        await this.createAccessToken();
      }

      this.saveTokens();
    } catch (error) {
      console.error('YeelightAuthManager: 获取 access token 失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取 token 列表
   * @returns {Promise<Array>} token 列表
   */
  async getTokenList() {
    if (!this.tokens?.jwtAuthToken) {
      throw new Error('未登录');
    }

    try {
      const response = await this.httpClient.get(this.tokenListUrl, {
        headers: {
          'jwt-auth-token': this.tokens.jwtAuthToken
        }
      });

      if (response.data.success && response.data.code === '200') {
        return response.data.data || [];
      }

      return [];
    } catch (error) {
      console.error('YeelightAuthManager: 获取 token 列表失败:', error.message);
      throw error;
    }
  }

  /**
   * 创建新的 access token
   * @returns {Promise<Object>} 新创建的 token
   */
  async createAccessToken() {
    if (!this.tokens?.jwtAuthToken) {
      throw new Error('未登录');
    }

    try {
      const response = await this.httpClient.post(
        this.tokenCreateUrl,
        {},
        {
          headers: {
            'jwt-auth-token': this.tokens.jwtAuthToken,
            'content-type': 'application/json'
          }
        }
      );

      if (response.data.success && response.data.code === '200') {
        const tokenData = response.data.data;
        this.tokens.accessToken = tokenData.token;
        this.tokens.accessTokenId = tokenData.id;
        console.log('YeelightAuthManager: 创建新 access token 成功');
        return tokenData;
      }

      throw new Error(response.data.msg || '创建 token 失败');
    } catch (error) {
      console.error('YeelightAuthManager: 创建 access token 失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取当前 access token
   * @returns {Promise<string>} access token
   */
  async getCurrentToken() {
    if (!this.tokens?.accessToken) {
      throw new Error('未认证');
    }

    return this.tokens.accessToken;
  }

  /**
   * 检查是否已认证
   * @returns {boolean} 是否已认证
   */
  isAuthenticated() {
    return !!(this.tokens?.accessToken);
  }

  /**
   * 获取当前认证状态
   * @returns {Object} 认证状态
   */
  getAuthStatus() {
    if (!this.tokens) {
      return {
        authenticated: false,
        userInfo: null,
        expiresAt: null
      };
    }

    return {
      authenticated: this.isAuthenticated(),
      userInfo: {
        username: this.tokens.username
      },
      loginTime: this.tokens.loginTime
    };
  }

  /**
   * 登出
   */
  clearTokens() {
    this.tokens = null;
    if (fs.existsSync(this.tokenFilePath)) {
      fs.unlinkSync(this.tokenFilePath);
    }
    console.log('YeelightAuthManager: 已登出');
    this.emit('logout');
  }

  /**
   * 刷新 access token
   * @returns {Promise<Object>} 新的 token
   */
  async refreshAccessToken() {
    if (this.isRefreshing) {
      // 避免并发刷新
      return new Promise((resolve, reject) => {
        const checkInterval = setInterval(() => {
          if (!this.isRefreshing) {
            clearInterval(checkInterval);
            if (this.tokens?.accessToken) {
              resolve(this.tokens);
            } else {
              reject(new Error('Token 刷新失败'));
            }
          }
        }, 100);
      });
    }

    this.isRefreshing = true;

    try {
      // 创建新的 access token
      await this.createAccessToken();
      this.saveTokens();
      this.emit('tokenRefreshed', this.tokens);
      return this.tokens;
    } catch (error) {
      console.error('YeelightAuthManager: 刷新 token 失败:', error.message);
      this.emit('authError', error);
      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * 清理资源
   */
  cleanup() {
    console.log('YeelightAuthManager: 清理资源');
  }
}

module.exports = YeelightAuthManager;
