const EventEmitter = require('events');
const axios = require('axios');
const OAuthManager = require('./OAuthManager');
const ConfigManager = require('./ConfigManager');

class YeelightCloudService extends EventEmitter {
  constructor() {
    super();
    this.configManager = new ConfigManager();
    this.oauthManager = new OAuthManager();
    // 从配置中获取API基础URL
    this.apiBaseUrl = this.configManager.getConfig('cloudService.apiBaseUrl', '');
    this.httpClient = axios.create({
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // 注册请求拦截器，自动添加Authorization头
    this.httpClient.interceptors.request.use(
      async (config) => {
        if (this.oauthManager.isAuthenticated()) {
          const token = await this.oauthManager.getCurrentToken();
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
        
        // 处理token过期情况
        if (error.response && error.response.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            // 尝试刷新token
            await this.oauthManager.refreshAccessToken();
            const token = await this.oauthManager.getCurrentToken();
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return this.httpClient(originalRequest);
          } catch (refreshError) {
            // 刷新失败，触发认证错误事件
            this.oauthManager.emit('authError', refreshError);
            return Promise.reject(refreshError);
          }
        }
        
        return Promise.reject(error);
      }
    );
    
    // 监听OAuth事件
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
  }
  
  /**
   * 设置API基础URL
   * @param {string} url - API基础URL
   */
  setApiBaseUrl(url) {
    this.apiBaseUrl = url;
  }
  
  /**
   * 设置OAuth配置
   * @param {Object} config - OAuth配置
   */
  setOAuthConfig(config) {
    this.oauthManager.setConfig(config);
  }
  
  /**
   * 获取授权URL
   * @param {string} state - 随机字符串，用于防止CSRF攻击
   * @returns {string} 授权URL
   */
  getAuthorizationUrl(state) {
    return this.oauthManager.getAuthorizationUrl(state);
  }
  
  /**
   * 使用授权码换取访问令牌
   * @param {string} code - 授权码
   * @returns {Promise<Object>} 包含access_token和refresh_token的对象
   */
  async getAccessToken(code) {
    return this.oauthManager.getAccessToken(code);
  }
  
  /**
   * 检查是否已认证
   * @returns {boolean} 是否已认证
   */
  isAuthenticated() {
    return this.oauthManager.isAuthenticated();
  }
  
  /**
   * 获取当前认证状态
   * @returns {Object} 当前认证状态
   */
  getAuthStatus() {
    return this.oauthManager.getAuthStatus();
  }
  
  /**
   * 登出
   */
  logout() {
    this.oauthManager.clearTokens();
  }
  
  /**
   * 发送API请求
   * @param {string} method - 请求方法
   * @param {string} endpoint - API端点
   * @param {Object} data - 请求数据
   * @param {Object} headers - 额外的请求头
   * @returns {Promise<Object>} 响应数据
   */
  async sendApiRequest(method, endpoint, data = null, headers = {}) {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }
    
    const url = `${this.apiBaseUrl}${endpoint}`;
    const config = {
      method,
      url,
      headers: {
        ...headers
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await this.httpClient(config);
    return response.data;
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
   * 生成唯一的requestId
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
   * @param {Object} response - API响应
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
   * @param {Object} response - API响应
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
   * @param {Object} response - API响应
   * @returns {Object} 设备状态
   */
  parseQueryResponse(response) {
    if (!response || !response.payload || !response.payload.devices) {
      return {};
    }
    
    return response.payload.devices;
  }
  
  /**
   * 处理API错误
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
