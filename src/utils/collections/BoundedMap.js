/**
 * 有界 Map 容器
 * 继承自 Map，添加容量上限和 LRU（Least Recently Used）清理策略
 *
 * @class BoundedMap
 * @extends Map
 * @template K, V
 *
 * @example
 * const cache = new BoundedMap(100); // 最多存储100个条目
 *
 * cache.set('key1', 'value1');
 * cache.set('key2', 'value2');
 *
 * // 访问 key1，更新其访问时间
 * const value = cache.get('key1');
 *
 * // 当达到上限时，最久未使用的条目会被自动删除
 */
class BoundedMap extends Map {
  /**
   * @param {number} maxSize - 最大容量（默认1000）
   */
  constructor(maxSize = 1000) {
    super();
    this.maxSize = maxSize;

    // 访问顺序队列（LRU）
    // 队列头部是最久未使用的，尾部是最近使用的
    this.accessOrder = [];
  }

  /**
   * 设置键值对
   *
   * @param {K} key - 键
   * @param {V} value - 值
   * @returns {this}
   *
   * @example
   * map.set('key1', { data: 'value1' });
   */
  set(key, value) {
    if (this.has(key)) {
      // 键已存在，更新访问顺序
      this.updateAccessOrder(key);
    } else {
      // 新键，检查容量
      if (this.size >= this.maxSize) {
        this.evictOldest();
      }

      // 添加到访问顺序队列
      this.accessOrder.push(key);
    }

    return super.set(key, value);
  }

  /**
   * 获取值
   *
   * @param {K} key - 键
   * @returns {V|undefined} 值
   *
   * @example
   * const value = map.get('key1');
   */
  get(key) {
    if (this.has(key)) {
      // 更新访问顺序
      this.updateAccessOrder(key);
    }

    return super.get(key);
  }

  /**
   * 删除键值对
   *
   * @param {K} key - 键
   * @returns {boolean} 是否成功删除
   */
  delete(key) {
    if (this.has(key)) {
      this.removeFromAccessOrder(key);
      return super.delete(key);
    }

    return false;
  }

  /**
   * 清空所有键值对
   */
  clear() {
    this.accessOrder = [];
    super.clear();
  }

  /**
   * 淘汰最久未使用的条目
   *
   * @private
   * @returns {boolean} 是否成功淘汰
   */
  evictOldest() {
    if (this.accessOrder.length === 0) {
      return false;
    }

    // 获取最久未使用的键（队列头部）
    const oldestKey = this.accessOrder.shift();
    if (oldestKey !== undefined) {
      super.delete(oldestKey);
      console.log(`BoundedMap: 淘汰最久未使用的条目: ${oldestKey}`);
      return true;
    }

    return false;
  }

  /**
   * 更新访问顺序
   *
   * @private
   * @param {K} key - 键
   */
  updateAccessOrder(key) {
    // 从当前位置移除
    const index = this.accessOrder.indexOf(key);
    if (index !== -1) {
      this.accessOrder.splice(index, 1);
    }

    // 添加到队列尾部（最近使用）
    this.accessOrder.push(key);
  }

  /**
   * 从访问顺序中移除
   *
   * @private
   * @param {K} key - 键
   */
  removeFromAccessOrder(key) {
    const index = this.accessOrder.indexOf(key);
    if (index !== -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  /**
   * 获取最久未使用的键（不删除）
   *
   * @returns {K|undefined} 最久未使用的键
   */
  getOldest() {
    return this.accessOrder.length > 0 ? this.accessOrder[0] : undefined;
  }

  /**
   * 获取最近使用的键（不删除）
   *
   * @returns {K|undefined} 最近使用的键
   */
  getNewest() {
    const len = this.accessOrder.length;
    return len > 0 ? this.accessOrder[len - 1] : undefined;
  }

  /**
   * 获取当前容量利用率
   *
   * @returns {number} 利用率（0-1）
   */
  getUtilization() {
    return this.size / this.maxSize;
  }

  /**
   * 检查是否已满
   *
   * @returns {boolean} 是否已满
   */
  isFull() {
    return this.size >= this.maxSize;
  }

  /**
   * 获取剩余容量
   *
   * @returns {number} 剩余容量
   */
  getRemainingCapacity() {
    return Math.max(0, this.maxSize - this.size);
  }

  /**
   * 批量淘汰最久未使用的条目
   *
   * @param {number} count - 要淘汰的数量
   * @returns {number} 实际淘汰的数量
   */
  evictMultiple(count) {
    let evicted = 0;

    for (let i = 0; i < count && this.accessOrder.length > 0; i++) {
      if (this.evictOldest()) {
        evicted++;
      }
    }

    return evicted;
  }

  /**
   * 获取访问顺序数组（调试用）
   *
   * @returns {Array<K>} 访问顺序数组
   */
  getAccessOrder() {
    return [...this.accessOrder];
  }

  /**
   * 获取统计信息
   *
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      size: this.size,
      maxSize: this.maxSize,
      utilization: this.getUtilization(),
      remainingCapacity: this.getRemainingCapacity(),
      isFull: this.isFull(),
      oldest: this.getOldest(),
      newest: this.getNewest()
    };
  }

  /**
   * 打印统计信息（调试用）
   */
  printStats() {
    const stats = this.getStats();
    console.log('BoundedMap 统计信息:');
    console.log(`  当前大小: ${stats.size} / ${stats.maxSize}`);
    console.log(`  利用率: ${(stats.utilization * 100).toFixed(1)}%`);
    console.log(`  剩余容量: ${stats.remainingCapacity}`);
    console.log(`  最久未使用: ${stats.oldest}`);
    console.log(`  最近使用: ${stats.newest}`);
  }
}

module.exports = BoundedMap;
