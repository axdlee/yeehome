// SSDP调试工具，用于测试SSDP发现功能
const dgram = require('dgram');

class SSDPDebug {
  constructor() {
    this.socket = null;
  }
  
  // 测试SSDP发现
  testSSDPDiscovery() {
    console.log('开始测试SSDP发现...');
    
    // 创建UDP socket
    this.socket = dgram.createSocket('udp4');
    
    // 监听socket事件
    this.socket.on('listening', () => {
      const address = this.socket.address();
      console.log(`SSDP socket已启动，监听地址: ${address.address}:${address.port}`);
      
      // 发送SSDP搜索请求
      this.sendSSDPRequest();
    });
    
    this.socket.on('message', (message, remote) => {
      console.log(`收到来自 ${remote.address}:${remote.port} 的响应:`);
      console.log(message.toString());
    });
    
    this.socket.on('error', (error) => {
      console.error('SSDP错误:', error);
      this.socket.close();
    });
    
    // 绑定到随机端口
    this.socket.bind();
    
    // 5秒后停止测试
    setTimeout(() => {
      this.stopTest();
    }, 5000);
  }
  
  // 发送SSDP搜索请求
  sendSSDPRequest() {
    const searchMessage = [
      'M-SEARCH * HTTP/1.1',
      'HOST: 239.255.255.250:1982',
      'MAN: "ssdp:discover"',
      'ST: wifi_bulb',
      'MX: 3',
      ''
    ].join('\r\n');
    
    console.log('发送SSDP搜索请求:');
    console.log(searchMessage);
    
    const searchBuffer = Buffer.from(searchMessage);
    this.socket.send(searchBuffer, 1982, '239.255.255.250');
  }
  
  // 停止测试
  stopTest() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      console.log('SSDP测试已停止');
    }
  }
}

// 导出SSDPDebug类
module.exports = SSDPDebug;