/**
 * 缓存管理器
 * 提供 TTL（Time To Live）缓存功能，自动过期清理
 *
 * @class CacheManager
 *
 * @example
 * const cache = new CacheManager();
 * cache.set('devices', deviceList, 300000); // 5分钟缓存
 *
 * const cached = cache.get('devices');
 * if (cached) {
 *   return cached;
 * }
 */
class CacheManager {
  /**
   * @param {Object} [options] - 可选配置
   * @param {number} [options.defaultTTL] - 默认 TTL（毫秒）
   * @param {number} [options.cleanupInterval] - 清理间隔（毫秒）
   * @param {number} [options.maxSize] - 最大缓存条目数
   */
  constructor(options = {}) {
    this.cache = new Map(); // key -> value
    this.ttlMap = new Map(); // key -> expireTime
    this.accessCount = new Map(); // key -> count（访问次数）

    this.defaultTTL = options.defaultTTL || 300000; // 默认5分钟
    this.cleanupInterval = options.cleanupInterval || 60000; // 默认每分钟清理
    this.maxSize = options.maxSize || 1000; // 默认最多1000条

    // 启动自动清理任务
    this.cleanupTask = setInterval(() => this.cleanup(), this.cleanupInterval);

    // 统计信息
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0
    };
  }

  /**
   * 设置缓存
   *
   * @param {string} key - 缓存键
   * @param {*} value - 缓存值
   * @param {number} [ttl] - TTL（毫秒），如果不提供则使用默认值
   *
   * @example
   * cache.set('user:123', userData, 600000); // 10分钟缓存
   */
  set(key, value, ttl = this.defaultTTL) {
    // 检查缓存大小
    if (!this.cache.has(key) && this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    // 设置缓存
    this.cache.set(key, value);
    this.ttlMap.set(key, Date.now() + ttl);

    // 初始化访问计数
    if (!this.accessCount.has(key)) {
      this.accessCount.set(key, 0);
    }
  }

  /**
   * 获取缓存
   *
   * @param {string} key - 缓存键
   * @returns {*} 缓存值，如果不存在或已过期返回 null
   *
   * @example
   * const data = cache.get('user:123');
   * if (data) {
   *   console.log('缓存命中');
   * }
   */
  get(key) {
    if (!this.cache.has(key)) {
      this.stats.misses++;
      return null;
    }

    // 检查是否过期
    const expireTime = this.ttlMap.get(key);
    if (Date.now() > expireTime) {
      this.delete(key);
      this.stats.misses++;
      return null;
    }

    // 更新访问计数
    this.accessCount.set(key, (this.accessCount.get(key) || 0) + 1);

    // 缓存命中
    this.stats.hits++;
    return this.cache.get(key);
  }

  /**
   * 删除缓存
   *
   * @param {string} key - 缓存键
   * @returns {boolean} 是否成功删除
   */
  delete(key) {
    const existed = this.cache.has(key);

    this.cache.delete(key);
    this.ttlMap.delete(key);
    this.accessCount.delete(key);

    return existed;
  }

  /**
   * 检查缓存是否存在且有效
   *
   * @param {string} key - 缓存键
   * @returns {boolean} 是否存在
   */
  has(key) {
    if (!this.cache.has(key)) {
      return false;
    }

    // 检查是否过期
    const expireTime = this.ttlMap.get(key);
    if (Date.now() > expireTime) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 清理过期缓存
   * @private
   */
  cleanup() {
    const now = Date.now();
    const expiredKeys = [];

    for (const [key, expireTime] of this.ttlMap.entries()) {
      if (now > expireTime) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.delete(key);
    }

    if (expiredKeys.length > 0) {
      console.log(`CacheManager: 已清理 ${expiredKeys.length} 个过期缓存`);
    }
  }

  /**
   * 淘汰最少使用的缓存（LRU）
   * @private
   */
  evictLRU() {
    let lruKey = null;
    let minAccessCount = Infinity;

    // 找到访问次数最少的键
    for (const [key, count] of this.accessCount.entries()) {
      if (count < minAccessCount) {
        minAccessCount = count;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.delete(lruKey);
      this.stats.evictions++;
      console.log(`CacheManager: 淘汰最少使用的缓存: ${lruKey}`);
    }
  }

  /**
   * 清空所有缓存
   */
  clear() {
    this.cache.clear();
    this.ttlMap.clear();
    this.accessCount.clear();
    console.log('CacheManager: 所有缓存已清空');
  }

  /**
   * 获取缓存大小
   *
   * @returns {number} 缓存条目数
   */
  size() {
    return this.cache.size;
  }

  /**
   * 获取所有缓存键
   *
   * @returns {Array<string>} 缓存键列表
   */
  keys() {
    return Array.from(this.cache.keys());
  }

  /**
   * 获取缓存命中率
   *
   * @returns {number} 命中率（0-1）
   */
  getHitRate() {
    const total = this.stats.hits + this.stats.misses;
    return total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * 获取统计信息
   *
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.stats.hits,
      misses: this.stats.misses,
      evictions: this.stats.evictions,
      hitRate: (this.getHitRate() * 100).toFixed(2) + '%',
      utilization: ((this.cache.size / this.maxSize) * 100).toFixed(2) + '%'
    };
  }

  /**
   * 重置统计信息
   */
  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0
    };
  }

  /**
   * 销毁缓存管理器
   */
  destroy() {
    // 清理定时器
    if (this.cleanupTask) {
      clearInterval(this.cleanupTask);
      this.cleanupTask = null;
    }

    // 清空所有缓存
    this.clear();

    console.log('CacheManager: 已销毁');
  }

  /**
   * 批量设置缓存
   *
   * @param {Object} entries - 键值对对象
   * @param {number} [ttl] - TTL（毫秒）
   */
  setMultiple(entries, ttl = this.defaultTTL) {
    for (const [key, value] of Object.entries(entries)) {
      this.set(key, value, ttl);
    }
  }

  /**
   * 批量获取缓存
   *
   * @param {Array<string>} keys - 缓存键列表
   * @returns {Object} 键值对对象
   */
  getMultiple(keys) {
    const result = {};

    for (const key of keys) {
      const value = this.get(key);
      if (value !== null) {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * 获取或设置缓存（如果不存在则调用工厂函数）
   *
   * @param {string} key - 缓存键
   * @param {Function} factory - 工厂函数（返回值会被缓存）
   * @param {number} [ttl] - TTL（毫秒）
   * @returns {Promise<*>} 缓存值
   *
   * @example
   * const devices = await cache.getOrSet('devices', async () => {
   *   return await api.getDevices();
   * }, 300000);
   */
  async getOrSet(key, factory, ttl = this.defaultTTL) {
    // 尝试从缓存获取
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }

    // 调用工厂函数获取值
    const value = await factory();

    // 存入缓存
    this.set(key, value, ttl);

    return value;
  }
}

module.exports = CacheManager;
