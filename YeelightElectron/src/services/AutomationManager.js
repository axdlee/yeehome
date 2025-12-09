const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');

class AutomationManager extends EventEmitter {
  constructor() {
    super();
    this.automations = [];
    this.dataPath = path.join(__dirname, '../data');
    this.automationsFilePath = path.join(this.dataPath, 'automations.json');
    
    // 确保数据目录存在
    this.ensureDataDirectory();
    
    // 加载自动化数据
    this.loadAutomations();
    
    // 初始化定时器
    this.timers = new Map();
    this.startTimers();
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
   * 从文件加载自动化数据
   */
  loadAutomations() {
    try {
      if (fs.existsSync(this.automationsFilePath)) {
        const data = fs.readFileSync(this.automationsFilePath, 'utf8');
        this.automations = JSON.parse(data);
        console.log('已加载自动化数据:', this.automations);
      } else {
        // 初始化默认自动化
        this.automations = [
          {
            id: 1,
            name: '早上自动开灯',
            description: '每天早上7点自动开灯',
            enabled: true,
            trigger: {
              type: 'time',
              time: '07:00',
              repeat: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
            },
            actions: [
              {
                type: 'device',
                deviceId: 'all',
                method: 'set_power',
                params: ['on', 'smooth', 1000]
              },
              {
                type: 'device',
                deviceId: 'all',
                method: 'set_bright',
                params: [70, 'smooth', 1000]
              }
            ]
          },
          {
            id: 2,
            name: '晚上自动关灯',
            description: '每天晚上11点自动关灯',
            enabled: true,
            trigger: {
              type: 'time',
              time: '23:00',
              repeat: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
            },
            actions: [
              {
                type: 'device',
                deviceId: 'all',
                method: 'set_power',
                params: ['off', 'smooth', 1000]
              }
            ]
          }
        ];
        this.saveAutomations();
        console.log('已初始化默认自动化数据');
      }
    } catch (error) {
      console.error('加载自动化数据错误:', error);
      this.automations = [];
    }
  }

  /**
   * 保存自动化数据到文件
   */
  saveAutomations() {
    try {
      fs.writeFileSync(this.automationsFilePath, JSON.stringify(this.automations, null, 2), 'utf8');
      console.log('自动化数据已保存');
    } catch (error) {
      console.error('保存自动化数据错误:', error);
    }
  }

  /**
   * 获取所有自动化
   * @returns {Array} 自动化列表
   */
  getAutomations() {
    return this.automations;
  }

  /**
   * 根据ID获取自动化
   * @param {number} id - 自动化ID
   * @returns {Object|null} 自动化信息
   */
  getAutomation(id) {
    return this.automations.find(automation => automation.id === id) || null;
  }

  /**
   * 创建新自动化
   * @param {Object} automationData - 自动化数据
   * @returns {Object} 新创建的自动化
   */
  createAutomation(automationData) {
    if (!automationData.name || automationData.name.trim() === '') {
      throw new Error('自动化名称不能为空');
    }

    // 检查自动化名称是否已存在
    const existingAutomation = this.automations.find(automation => automation.name === automationData.name);
    if (existingAutomation) {
      throw new Error('自动化名称已存在');
    }

    // 创建新自动化
    const newAutomation = {
      id: Date.now(),
      name: automationData.name,
      description: automationData.description || '',
      enabled: automationData.enabled !== undefined ? automationData.enabled : true,
      trigger: automationData.trigger || {
        type: 'time',
        time: '12:00',
        repeat: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      },
      actions: automationData.actions || []
    };

    this.automations.push(newAutomation);
    this.saveAutomations();
    this.emit('automationCreated', newAutomation);
    
    // 如果是时间触发且已启用，启动定时器
    if (newAutomation.enabled && newAutomation.trigger.type === 'time') {
      this.startTimer(newAutomation);
    }

    return newAutomation;
  }

  /**
   * 更新自动化
   * @param {number} id - 自动化ID
   * @param {Object} automationData - 新的自动化数据
   * @returns {Object|null} 更新后的自动化信息
   */
  updateAutomation(id, automationData) {
    if (!automationData.name || automationData.name.trim() === '') {
      throw new Error('自动化名称不能为空');
    }

    const index = this.automations.findIndex(automation => automation.id === id);
    if (index === -1) {
      return null;
    }

    // 检查自动化名称是否已存在（排除当前自动化）
    const existingAutomation = this.automations.find(automation => automation.name === automationData.name && automation.id !== id);
    if (existingAutomation) {
      throw new Error('自动化名称已存在');
    }

    const oldAutomation = this.automations[index];
    this.automations[index] = {
      ...this.automations[index],
      ...automationData
    };
    
    this.saveAutomations();
    this.emit('automationUpdated', this.automations[index]);
    
    // 更新定时器
    if (oldAutomation.trigger.type === 'time') {
      this.stopTimer(oldAutomation.id);
    }
    
    if (this.automations[index].enabled && this.automations[index].trigger.type === 'time') {
      this.startTimer(this.automations[index]);
    }

    return this.automations[index];
  }

  /**
   * 删除自动化
   * @param {number} id - 自动化ID
   * @returns {boolean} 是否删除成功
   */
  deleteAutomation(id) {
    const index = this.automations.findIndex(automation => automation.id === id);
    if (index === -1) {
      return false;
    }

    const deletedAutomation = this.automations.splice(index, 1)[0];
    this.saveAutomations();
    this.emit('automationDeleted', deletedAutomation);
    
    // 停止定时器
    this.stopTimer(id);

    return true;
  }

  /**
   * 切换自动化开关
   * @param {number} id - 自动化ID
   * @returns {Object|null} 更新后的自动化信息
   */
  toggleAutomation(id) {
    const automation = this.getAutomation(id);
    if (!automation) {
      return null;
    }

    automation.enabled = !automation.enabled;
    this.saveAutomations();
    this.emit('automationUpdated', automation);
    
    // 切换定时器
    if (automation.trigger.type === 'time') {
      if (automation.enabled) {
        this.startTimer(automation);
      } else {
        this.stopTimer(id);
      }
    }

    return automation;
  }

  /**
   * 执行自动化动作
   * @param {number} id - 自动化ID
   */
  executeAutomation(id) {
    const automation = this.getAutomation(id);
    if (!automation || !automation.enabled) {
      return;
    }

    console.log(`执行自动化: ${automation.name}`);
    this.emit('automationExecuted', id, automation.actions);
  }

  /**
   * 启动所有定时器
   */
  startTimers() {
    this.automations.forEach(automation => {
      if (automation.enabled && automation.trigger.type === 'time') {
        this.startTimer(automation);
      }
    });
  }

  /**
   * 启动单个定时器
   * @param {Object} automation - 自动化信息
   */
  startTimer(automation) {
    // 停止现有定时器
    this.stopTimer(automation.id);
    
    // 解析时间
    const [hours, minutes] = automation.trigger.time.split(':').map(Number);
    
    // 创建定时器
    const now = new Date();
    const targetTime = new Date();
    targetTime.setHours(hours, minutes, 0, 0);
    
    // 如果目标时间已过，设置为明天
    if (targetTime < now) {
      targetTime.setDate(targetTime.getDate() + 1);
    }
    
    const delay = targetTime.getTime() - now.getTime();
    
    const timer = setTimeout(() => {
      // 检查是否需要执行（基于重复规则）
      const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });
      if (automation.trigger.repeat.includes(dayOfWeek)) {
        this.executeAutomation(automation.id);
      }
      
      // 重新设置定时器
      this.startTimer(automation);
    }, delay);
    
    this.timers.set(automation.id, timer);
    console.log(`已启动自动化定时器: ${automation.name} (${automation.trigger.time})`);
  }

  /**
   * 停止单个定时器
   * @param {number} id - 自动化ID
   */
  stopTimer(id) {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
      console.log(`已停止自动化定时器: ${id}`);
    }
  }

  /**
   * 清理不存在的设备引用
   * @param {Array} validDeviceIds - 有效的设备ID列表
   */
  cleanupDevices(validDeviceIds) {
    let hasChanges = false;
    
    this.automations.forEach(automation => {
      automation.actions.forEach(action => {
        if (action.type === 'device' && action.deviceId !== 'all') {
          if (!validDeviceIds.includes(action.deviceId)) {
            // 可以选择删除这个动作或保留它
            // 这里选择保留，因为用户可能会重新添加该设备
          }
        }
      });
    });
    
    if (hasChanges) {
      this.saveAutomations();
      this.emit('automationsCleanedUp');
    }
  }

  /**
   * 销毁时清理资源
   */
  destroy() {
    // 停止所有定时器
    for (const [id, timer] of this.timers) {
      clearTimeout(timer);
    }
    this.timers.clear();
  }
}