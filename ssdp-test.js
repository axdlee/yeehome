// SSDP测试脚本
const SSDPDebug = require('./src/services/SSDPDebug');

// 创建SSDP调试实例
const ssdpDebug = new SSDPDebug();

// 开始测试SSDP发现
ssdpDebug.testSSDPDiscovery();

// 5秒后退出
setTimeout(() => {
  console.log('测试完成');
  process.exit(0);
}, 5000);