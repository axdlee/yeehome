const EventEmitter = require('events');
const axios = require('axios');
const OAuthManager = require('./OAuthManager');
const YeelightAuthManager = require('./YeelightAuthManager');
const ConfigManager = require('./ConfigManager');

class YeelightCloudService extends EventEmitter {
  // 单例实例
  static instance = null;

  /**
   * 获取单例实例
   * @returns {YeelightCloudService} 服务实例
   */
  static getInstance() {
    if (!YeelightCloudService.instance) {
      YeelightCloudService.instance = new YeelightCloudService();
    }
    return YeelightCloudService.instance;
  }

  constructor() {
    super();
    // 防止直接实例化，建议使用 getInstance()
    if (YeelightCloudService.instance) {
      console.warn('YeelightCloudService: 建议使用 getInstance() 获取单例实例');
    }

    this.configManager = new ConfigManager();
    this.oauthManager = new OAuthManager();
    this.jwtAuthManager = new YeelightAuthManager();

    // 选择认证方式：'jwt' 或 'oauth'
    this.authMode = 'jwt'; // 默认使用 JWT 认证

    // 从配置中获取 API 基础 URL
    this.apiBaseUrl = this.configManager.getConfig('cloudService.apiBaseUrl', 'https://api.yeelight.com');

    this.httpClient = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // 注册请求拦截器，自动添加 Authorization 头
    this.httpClient.interceptors.request.use(
      async (config) => {
        if (this.isAuthenticated()) {
          const token = await this.getCurrentToken();
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // 注册响应拦截器，处理错误情况
    this.httpClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // 处理 token 过期情况
        if (error.response && error.response.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            // 尝试刷新 token
            if (this.authMode === 'jwt') {
              await this.jwtAuthManager.refreshAccessToken();
            } else {
              await this.oauthManager.refreshAccessToken();
            }
            const token = await this.getCurrentToken();
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return this.httpClient(originalRequest);
          } catch (refreshError) {
            // 刷新失败，触发认证错误事件
            this.emit('authError', refreshError);
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );

    // 监听 OAuth 事件
    this.oauthManager.on('authenticated', (tokens) => {
      this.emit('authenticated', tokens);
    });

    this.oauthManager.on('tokenRefreshed', (tokens) => {
      this.emit('tokenRefreshed', tokens);
    });

    this.oauthManager.on('authError', (error) => {
      this.emit('authError', error);
    });

    this.oauthManager.on('logout', () => {
      this.emit('logout');
    });

    // 监听 JWT Auth 事件
    this.jwtAuthManager.on('authenticated', (tokens) => {
      console.log('YeelightCloudService: JWT 认证成功');
      this.emit('authenticated', tokens);
    });

    this.jwtAuthManager.on('tokenRefreshed', (tokens) => {
      console.log('YeelightCloudService: JWT token 已刷新');
      this.emit('tokenRefreshed', tokens);
    });

    this.jwtAuthManager.on('authError', (error) => {
      console.log('YeelightCloudService: JWT 认证错误:', error.message);
      this.emit('authError', error);
    });

    this.jwtAuthManager.on('logout', () => {
      console.log('YeelightCloudService: JWT 已登出');
      this.emit('logout');
    });
  }

  /**
   * 设置认证模式
   * @param {string} mode - 'jwt' 或 'oauth'
   */
  setAuthMode(mode) {
    this.authMode = mode;
    console.log(`YeelightCloudService: 认证模式切换为 ${mode}`);
  }

  /**
   * 使用用户名密码登录（JWT 方式）
   * @param {string} username - 用户名/邮箱
   * @param {string} password - 密码
   * @returns {Promise<Object>} 登录结果
   */
  async login(username, password) {
    this.authMode = 'jwt';
    return this.jwtAuthManager.login(username, password);
  }

  /**
   * 设置 API 基础 URL
   * @param {string} url - API 基础 URL
   */
  setApiBaseUrl(url) {
    // 确保 URL 有效，如果为空则使用默认值
    this.apiBaseUrl = url && url.trim() !== '' ? url : 'https://api.yeelight.com';
  }

  /**
   * 设置 OAuth 配置
   * @param {Object} config - OAuth 配置
   */
  setOAuthConfig(config) {
    this.oauthManager.setConfig(config);
  }

  /**
   * 获取授权 URL（OAuth 方式）
   * @param {string} state - 随机字符串，用于防止 CSRF 攻击
   * @returns {string} 授权 URL
   */
  getAuthorizationUrl(state) {
    return this.oauthManager.getAuthorizationUrl(state);
  }

  /**
   * 使用授权码换取访问令牌（OAuth 方式）
   * @param {string} code - 授权码
   * @returns {Promise<Object>} 包含 access_token 和 refresh_token 的对象
   */
  async getAccessToken(code) {
    this.authMode = 'oauth';
    return this.oauthManager.getAccessToken(code);
  }

  /**
   * 检查是否已认证
   * @returns {boolean} 是否已认证
   */
  isAuthenticated() {
    if (this.authMode === 'jwt') {
      return this.jwtAuthManager.isAuthenticated();
    }
    return this.oauthManager.isAuthenticated();
  }

  /**
   * 获取当前 access token
   * @returns {Promise<string>} access token
   */
  async getCurrentToken() {
    if (this.authMode === 'jwt') {
      return this.jwtAuthManager.getCurrentToken();
    }
    return this.oauthManager.getCurrentToken();
  }

  /**
   * 获取当前认证状态
   * @returns {Object} 当前认证状态
   */
  getAuthStatus() {
    if (this.authMode === 'jwt') {
      return this.jwtAuthManager.getAuthStatus();
    }
    return this.oauthManager.getAuthStatus();
  }

  /**
   * 登出
   */
  logout() {
    if (this.authMode === 'jwt') {
      this.jwtAuthManager.clearTokens();
    } else {
      this.oauthManager.clearTokens();
    }
  }

  /**
   * 发送 API 请求
   * @param {string} method - 请求方法
   * @param {string} endpoint - API 端点
   * @param {Object} data - 请求数据
   * @param {Object} headers - 额外的请求头
   * @returns {Promise<Object>} 响应数据
   */
  async sendApiRequest(method, endpoint, data = null, headers = {}) {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    // 确保 apiBaseUrl 有效，提供默认值保护
    const validApiBaseUrl = this.apiBaseUrl && this.apiBaseUrl.trim() !== ''
      ? this.apiBaseUrl
      : 'https://api.yeelight.com';

    const url = `${validApiBaseUrl}${endpoint}`;
    const config = {
      method,
      url,
      headers: {
        ...headers
      },
      timeout: 30000 // 添加30秒超时，防止请求挂起
    };

    if (data) {
      config.data = data;
    }

    try {
      const response = await this.httpClient(config);
      return response.data;
    } catch (error) {
      console.error(`API 请求失败: ${method} ${url}`, error.message);
      throw error;
    }
  }

  /**
   * 设备发现 - 获取设备列表
   * @returns {Promise<Object>} 设备列表
   */
  async discoverDevices() {
    const requestId = this.generateRequestId();
    const data = {
      requestId,
      inputs: [
        {
          intent: 'action.devices.SYNC'
        }
      ]
    };

    return this.sendApiRequest('POST', '/', data);
  }

  /**
   * 设备控制
   * @param {Array} commands - 命令列表
   * @returns {Promise<Object>} 控制结果
   */
  async controlDevices(commands) {
    const requestId = this.generateRequestId();
    const data = {
      requestId,
      inputs: [
        {
          intent: 'action.devices.EXECUTE',
          payload: {
            commands
          }
        }
      ]
    };

    return this.sendApiRequest('POST', '/', data);
  }

  /**
   * 查询设备状态
   * @param {Array} devices - 设备列表
   * @returns {Promise<Object>} 设备状态
   */
  async queryDevices(devices) {
    const requestId = this.generateRequestId();
    const data = {
      requestId,
      inputs: [
        {
          intent: 'action.devices.QUERY',
          payload: {
            devices
          }
        }
      ]
    };

    return this.sendApiRequest('POST', '/', data);
  }

  /**
   * 生成唯一的 requestId
   * @returns {string} requestId
   */
  generateRequestId() {
    return `${Date.now()}${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 创建设备控制命令
   * @param {Array} devices - 设备列表
   * @param {Array} executions - 执行命令列表
   * @returns {Object} 命令对象
   */
  createControlCommand(devices, executions) {
    return {
      devices,
      execution: executions
    };
  }

  /**
   * 创建设备查询请求
   * @param {Array} devices - 设备列表
   * @returns {Array} 查询请求设备列表
   */
  createQueryDevices(devices) {
    return devices;
  }

  /**
   * 解析设备列表响应
   * @param {Object} response - API 响应
   * @returns {Array} 设备列表
   */
  parseDevicesResponse(response) {
    if (!response || !response.payload || !response.payload.devices) {
      return [];
    }

    return response.payload.devices;
  }

  /**
   * 解析设备控制响应
   * @param {Object} response - API 响应
   * @returns {Object} 控制结果
   */
  parseControlResponse(response) {
    if (!response || !response.payload || !response.payload.commands) {
      return {
        success: false,
        commands: []
      };
    }

    return {
      success: true,
      commands: response.payload.commands
    };
  }

  /**
   * 解析设备查询响应
   * @param {Object} response - API 响应
   * @returns {Object} 设备状态
   */
  parseQueryResponse(response) {
    if (!response || !response.payload || !response.payload.devices) {
      return {};
    }

    return response.payload.devices;
  }

  /**
   * 处理 API 错误
   * @param {Error} error - 错误对象
   * @returns {Object} 错误信息
   */
  handleApiError(error) {
    let errorMessage = 'API请求失败';
    let errorCode = 'UNKNOWN_ERROR';

    if (error.response) {
      // 服务器返回了错误状态码
      const data = error.response.data;
      if (data.error) {
        errorCode = data.error;
      }
      if (data.error_description) {
        errorMessage = data.error_description;
      } else if (data.msg) {
        errorMessage = data.msg;
      } else {
        errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`;
      }
    } else if (error.request) {
      // 请求已发送，但没有收到响应
      errorMessage = '服务器无响应';
      errorCode = 'NO_RESPONSE';
    } else {
      // 请求配置出错
      errorMessage = error.message;
      errorCode = 'REQUEST_ERROR';
    }

    return {
      code: errorCode,
      message: errorMessage,
      originalError: error
    };
  }
}

module.exports = YeelightCloudService;
