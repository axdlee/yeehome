const EventEmitter = require('events');

/**
 * 事件管理器
 * 自动跟踪和管理 EventEmitter 监听器，防止内存泄漏
 *
 * @class EventManager
 *
 * @example
 * const eventManager = new EventManager();
 *
 * // 注册监听器
 * const unsubscribe = eventManager.on(emitter, 'data', (data) => {
 *   console.log(data);
 * });
 *
 * // 取消监听
 * unsubscribe();
 *
 * // 清理所有监听器
 * eventManager.cleanup();
 */
class EventManager {
  constructor() {
    // 跟踪所有监听器
    // key: `${emitterName}:${eventName}`, value: [{ emitter, handler }]
    this.listeners = new Map();

    // 监听器计数器
    this.listenerCount = 0;
  }

  /**
   * 注册事件监听器（包装 EventEmitter.on）
   *
   * @param {EventEmitter} emitter - 事件发射器
   * @param {string} event - 事件名称
   * @param {Function} handler - 事件处理函数
   * @param {Object} [context] - 可选的上下文对象（用于 bind）
   * @returns {Function} 取消订阅函数
   *
   * @example
   * const unsubscribe = eventManager.on(service, 'data', handleData);
   * // 稍后取消订阅
   * unsubscribe();
   */
  on(emitter, event, handler, context = null) {
    // 如果提供了上下文，绑定 this
    const wrappedHandler = context ? handler.bind(context) : handler;

    // 注册监听器
    emitter.on(event, wrappedHandler);

    // 生成唯一键
    const key = this.getKey(emitter, event);

    // 跟踪监听器
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }

    const listenerInfo = {
      emitter,
      event,
      handler: wrappedHandler,
      originalHandler: handler,
      id: ++this.listenerCount
    };

    this.listeners.get(key).push(listenerInfo);

    // 返回取消订阅函数
    return () => this.off(emitter, event, wrappedHandler);
  }

  /**
   * 注册一次性事件监听器
   *
   * @param {EventEmitter} emitter - 事件发射器
   * @param {string} event - 事件名称
   * @param {Function} handler - 事件处理函数
   * @returns {Function} 取消订阅函数
   */
  once(emitter, event, handler) {
    const wrappedHandler = (...args) => {
      handler(...args);
      this.off(emitter, event, wrappedHandler);
    };

    return this.on(emitter, event, wrappedHandler);
  }

  /**
   * 取消事件监听器
   *
   * @param {EventEmitter} emitter - 事件发射器
   * @param {string} event - 事件名称
   * @param {Function} handler - 事件处理函数
   */
  off(emitter, event, handler) {
    emitter.off(event, handler);

    const key = this.getKey(emitter, event);
    const listeners = this.listeners.get(key);

    if (listeners) {
      const index = listeners.findIndex(l => l.handler === handler);
      if (index !== -1) {
        listeners.splice(index, 1);

        // 如果该事件没有监听器了，删除键
        if (listeners.length === 0) {
          this.listeners.delete(key);
        }
      }
    }
  }

  /**
   * 取消指定发射器上的所有监听器
   *
   * @param {EventEmitter} emitter - 事件发射器
   */
  offAll(emitter) {
    const keysToDelete = [];

    for (const [key, listeners] of this.listeners.entries()) {
      const filtered = listeners.filter(l => {
        if (l.emitter === emitter) {
          // 从 emitter 上移除监听器
          emitter.off(l.event, l.handler);
          return false; // 不保留
        }
        return true; // 保留
      });

      if (filtered.length === 0) {
        keysToDelete.push(key);
      } else if (filtered.length !== listeners.length) {
        this.listeners.set(key, filtered);
      }
    }

    // 删除空键
    keysToDelete.forEach(key => this.listeners.delete(key));
  }

  /**
   * 清理所有跟踪的监听器
   */
  cleanup() {
    console.log(`EventManager: 正在清理 ${this.getTotalListenerCount()} 个监听器...`);

    for (const [key, listeners] of this.listeners.entries()) {
      for (const { emitter, event, handler } of listeners) {
        try {
          emitter.off(event, handler);
        } catch (error) {
          console.error(`EventManager: 移除监听器失败 (${key}):`, error.message);
        }
      }
    }

    this.listeners.clear();
    this.listenerCount = 0;

    console.log('EventManager: 所有监听器已清理');
  }

  /**
   * 获取监听器总数
   *
   * @returns {number} 监听器总数
   */
  getTotalListenerCount() {
    let count = 0;
    for (const listeners of this.listeners.values()) {
      count += listeners.length;
    }
    return count;
  }

  /**
   * 获取指定发射器和事件的监听器数量
   *
   * @param {EventEmitter} emitter - 事件发射器
   * @param {string} event - 事件名称
   * @returns {number} 监听器数量
   */
  getListenerCount(emitter, event) {
    const key = this.getKey(emitter, event);
    const listeners = this.listeners.get(key);
    return listeners ? listeners.length : 0;
  }

  /**
   * 获取所有跟踪的监听器信息
   *
   * @returns {Array} 监听器信息数组
   */
  getAllListeners() {
    const result = [];

    for (const [key, listeners] of this.listeners.entries()) {
      for (const listener of listeners) {
        result.push({
          key,
          emitterName: listener.emitter.constructor.name,
          event: listener.event,
          id: listener.id
        });
      }
    }

    return result;
  }

  /**
   * 生成唯一键
   *
   * @private
   * @param {EventEmitter} emitter - 事件发射器
   * @param {string} event - 事件名称
   * @returns {string} 唯一键
   */
  getKey(emitter, event) {
    const emitterName = emitter.constructor.name || 'Unknown';
    return `${emitterName}:${event}`;
  }

  /**
   * 打印监听器统计信息（调试用）
   */
  printStats() {
    console.log('EventManager 统计信息:');
    console.log(`  总监听器数: ${this.getTotalListenerCount()}`);
    console.log('  分布:');

    for (const [key, listeners] of this.listeners.entries()) {
      console.log(`    ${key}: ${listeners.length} 个监听器`);
    }
  }
}

module.exports = EventManager;
