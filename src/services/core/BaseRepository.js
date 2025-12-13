const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

/**
 * 基础数据仓库类
 * 提供统一的数据持久化、CRUD 操作和事件发射
 *
 * 所有本地数据管理器应继承此类，避免重复代码
 *
 * @class BaseRepository
 * @extends EventEmitter
 *
 * @fires BaseRepository#loaded - 数据加载完成
 * @fires BaseRepository#saved - 数据保存完成
 * @fires BaseRepository#created - 创建新项目
 * @fires BaseRepository#updated - 更新项目
 * @fires BaseRepository#deleted - 删除项目
 *
 * @example
 * class RoomManager extends BaseRepository {
 *   constructor() {
 *     super('rooms.json');
 *   }
 *
 *   getDefaultData() {
 *     return [
 *       { id: 1, name: '客厅', devices: [] }
 *     ];
 *   }
 *
 *   validateItem(item) {
 *     if (!item.name) {
 *       throw new Error('房间名称不能为空');
 *     }
 *   }
 * }
 */
class BaseRepository extends EventEmitter {
  /**
   * @param {string} dataFileName - 数据文件名（例如：'rooms.json'）
   * @param {Object} [options] - 可选配置
   * @param {string} [options.dataDir] - 自定义数据目录
   * @param {boolean} [options.autoLoad] - 是否自动加载（默认 true）
   */
  constructor(dataFileName, options = {}) {
    super();

    // 使用 Electron 的 userData 目录
    const userDataPath = app.getPath('userData');
    this.dataPath = options.dataDir || path.join(userDataPath, 'data');
    this.filePath = path.join(this.dataPath, dataFileName);
    this.dataFileName = dataFileName;

    // 数据存储
    this.data = [];

    // 确保数据目录存在
    this.ensureDataDirectory();

    // 自动加载数据
    if (options.autoLoad !== false) {
      this.load();
    }
  }

  /**
   * 确保数据目录存在
   * @private
   */
  ensureDataDirectory() {
    if (!fs.existsSync(this.dataPath)) {
      fs.mkdirSync(this.dataPath, { recursive: true, mode: 0o700 });
    }
  }

  /**
   * 从文件加载数据
   */
  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const fileData = fs.readFileSync(this.filePath, 'utf8');
        this.data = JSON.parse(fileData);
        console.log(`BaseRepository: 已加载 ${this.dataFileName}, 共 ${this.data.length} 条记录`);
        this.emit('loaded', this.data);
      } else {
        // 文件不存在，使用默认数据
        this.data = this.getDefaultData();
        this.save();
        console.log(`BaseRepository: 已创建默认 ${this.dataFileName}`);
      }
    } catch (error) {
      console.error(`BaseRepository: 加载 ${this.dataFileName} 错误:`, error);
      this.data = [];
      this.emit('loadError', error);
    }
  }

  /**
   * 保存数据到文件
   */
  save() {
    try {
      const jsonData = JSON.stringify(this.data, null, 2);
      fs.writeFileSync(this.filePath, jsonData, { encoding: 'utf8', mode: 0o600 });
      this.emit('saved', this.data);
    } catch (error) {
      console.error(`BaseRepository: 保存 ${this.dataFileName} 错误:`, error);
      this.emit('saveError', error);
      throw error;
    }
  }

  /**
   * 获取默认数据（子类需要实现）
   * @returns {Array} 默认数据
   */
  getDefaultData() {
    return [];
  }

  /**
   * 验证项目（子类可以覆盖）
   * @param {Object} item - 要验证的项目
   * @throws {Error} 验证失败时抛出错误
   */
  validateItem(item) {
    // 默认不验证，子类可覆盖
  }

  /**
   * 查找所有项目
   * @returns {Array} 所有项目
   */
  findAll() {
    return [...this.data]; // 返回副本，防止外部修改
  }

  /**
   * 根据 ID 查找项目
   * @param {number} id - 项目ID
   * @returns {Object|null} 项目对象，如果不存在返回 null
   */
  findById(id) {
    return this.data.find(item => item.id === id) || null;
  }

  /**
   * 根据条件查找项目
   * @param {Function} predicate - 查找条件函数
   * @returns {Array} 符合条件的项目列表
   *
   * @example
   * const rooms = repository.findBy(item => item.name.includes('卧室'));
   */
  findBy(predicate) {
    return this.data.filter(predicate);
  }

  /**
   * 根据条件查找单个项目
   * @param {Function} predicate - 查找条件函数
   * @returns {Object|null} 符合条件的第一个项目，如果不存在返回 null
   */
  findOne(predicate) {
    return this.data.find(predicate) || null;
  }

  /**
   * 创建新项目
   * @param {Object} item - 项目数据
   * @returns {Object} 创建的项目（包含自动生成的 id 和时间戳）
   *
   * @example
   * const room = repository.create({ name: '客厅', devices: [] });
   */
  create(item) {
    // 验证项目
    this.validateItem(item);

    // 生成新项目
    const newItem = {
      id: this.generateId(),
      ...item,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 添加到数据数组
    this.data.push(newItem);

    // 保存到文件
    this.save();

    // 触发事件
    this.emit('created', newItem);

    return newItem;
  }

  /**
   * 更新项目
   * @param {number} id - 项目ID
   * @param {Object} updates - 要更新的字段
   * @returns {Object|null} 更新后的项目，如果项目不存在返回 null
   *
   * @example
   * const updated = repository.update(1, { name: '主卧室' });
   */
  update(id, updates) {
    const index = this.data.findIndex(item => item.id === id);
    if (index === -1) {
      console.warn(`BaseRepository: 项目 ${id} 不存在`);
      return null;
    }

    // 合并更新
    const updatedItem = {
      ...this.data[index],
      ...updates,
      id, // 确保 ID 不被修改
      createdAt: this.data[index].createdAt, // 保留创建时间
      updatedAt: new Date().toISOString()
    };

    // 验证更新后的项目
    this.validateItem(updatedItem);

    // 更新数据
    this.data[index] = updatedItem;

    // 保存到文件
    this.save();

    // 触发事件
    this.emit('updated', updatedItem);

    return updatedItem;
  }

  /**
   * 删除项目
   * @param {number} id - 项目ID
   * @returns {boolean} 是否成功删除
   *
   * @example
   * const success = repository.delete(1);
   */
  delete(id) {
    const index = this.data.findIndex(item => item.id === id);
    if (index === -1) {
      console.warn(`BaseRepository: 项目 ${id} 不存在`);
      return false;
    }

    // 删除项目
    const deletedItem = this.data.splice(index, 1)[0];

    // 保存到文件
    this.save();

    // 触发事件
    this.emit('deleted', deletedItem);

    return true;
  }

  /**
   * 批量删除
   * @param {Function} predicate - 删除条件函数
   * @returns {number} 删除的项目数量
   *
   * @example
   * const count = repository.deleteBy(item => item.devices.length === 0);
   */
  deleteBy(predicate) {
    const toDelete = this.data.filter(predicate);
    this.data = this.data.filter(item => !predicate(item));

    if (toDelete.length > 0) {
      this.save();
      toDelete.forEach(item => this.emit('deleted', item));
    }

    return toDelete.length;
  }

  /**
   * 检查项目是否存在
   * @param {number} id - 项目ID
   * @returns {boolean} 是否存在
   */
  exists(id) {
    return this.data.some(item => item.id === id);
  }

  /**
   * 获取数据总数
   * @returns {number} 项目总数
   */
  count() {
    return this.data.length;
  }

  /**
   * 清空所有数据
   */
  clear() {
    this.data = [];
    this.save();
    this.emit('cleared');
  }

  /**
   * 生成唯一 ID
   * @private
   * @returns {number} 唯一ID
   */
  generateId() {
    // 使用时间戳作为 ID
    let id = Date.now();

    // 确保 ID 唯一
    while (this.exists(id)) {
      id++;
    }

    return id;
  }

  /**
   * 批量创建
   * @param {Array<Object>} items - 项目数组
   * @returns {Array<Object>} 创建的项目数组
   */
  createBatch(items) {
    const createdItems = [];

    for (const item of items) {
      try {
        const newItem = this.create(item);
        createdItems.push(newItem);
      } catch (error) {
        console.error(`BaseRepository: 批量创建失败:`, error.message);
      }
    }

    return createdItems;
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      fileName: this.dataFileName,
      filePath: this.filePath,
      count: this.count(),
      lastSaved: fs.existsSync(this.filePath)
        ? fs.statSync(this.filePath).mtime.toISOString()
        : null
    };
  }

  /**
   * 导出数据（用于备份）
   * @param {string} exportPath - 导出文件路径
   */
  exportData(exportPath) {
    try {
      const jsonData = JSON.stringify(this.data, null, 2);
      fs.writeFileSync(exportPath, jsonData, { encoding: 'utf8', mode: 0o600 });
      console.log(`BaseRepository: 数据已导出到 ${exportPath}`);
    } catch (error) {
      console.error(`BaseRepository: 导出数据失败:`, error.message);
      throw error;
    }
  }

  /**
   * 导入数据（从备份恢复）
   * @param {string} importPath - 导入文件路径
   * @param {boolean} [merge=false] - 是否合并现有数据（默认覆盖）
   */
  importData(importPath, merge = false) {
    try {
      const jsonData = fs.readFileSync(importPath, 'utf8');
      const importedData = JSON.parse(jsonData);

      if (merge) {
        // 合并数据（避免 ID 冲突）
        const existingIds = new Set(this.data.map(item => item.id));
        const newItems = importedData.filter(item => !existingIds.has(item.id));
        this.data = [...this.data, ...newItems];
      } else {
        // 覆盖数据
        this.data = importedData;
      }

      this.save();
      console.log(`BaseRepository: 数据已导入，共 ${this.data.length} 条记录`);
      this.emit('imported', this.data);
    } catch (error) {
      console.error(`BaseRepository: 导入数据失败:`, error.message);
      throw error;
    }
  }
}

module.exports = BaseRepository;
