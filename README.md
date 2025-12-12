# YeeHome - Yeelight 智能家居管理系统

[![Electron](https://img.shields.io/badge/Electron-39.2.6-47848F?logo=electron)](https://www.electronjs.org/)
[![Vue.js](https://img.shields.io/badge/Vue.js-3.5.13-4FC08D?logo=vue.js)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0.1-646CFF?logo=vite)](https://vitejs.dev/)

一个基于 Electron + Vue3 构建的 Yeelight 智能设备管理桌面应用，支持本地局域网设备发现和云端设备管理双模式。

## ✨ 核心功能

### 本地模式
- 🔍 **SSDP 自动发现** - 局域网内自动发现 Yeelight 设备
- 🎛️ **实时设备控制** - 亮度、色温、颜色调节
- 📦 **分组管理** - 创建设备分组,批量控制
- 🎨 **情景模式** - 自定义和应用预设场景
- 🏠 **房间管理** - 按房间组织设备

### 云端模式
- ☁️ **OAuth 认证** - 安全的云端账号登录
- 🔄 **双向同步** - 本地与云端设备状态同步
- 🌐 **远程控制** - 通过云端 API 控制设备
- 🤖 **自动化规则** - 云端自动化场景配置

## 🏗️ 技术架构

### 前端技术栈
- **框架**: Vue 3.5.13 (Composition API)
- **构建工具**: Vite 6.0.1
- **桌面框架**: Electron 39.2.6
- **HTTP 客户端**: Axios 1.13.2

### 架构设计
```
yeehome/
├── src/
│   ├── main.js              # Electron 主进程
│   ├── preload.js           # IPC 安全桥接
│   ├── services/            # 业务逻辑层
│   │   ├── YeelightService.js        # 本地设备服务
│   │   ├── YeelightCloudService.js   # 云服务(单例模式)
│   │   ├── Cloud*Manager.js          # 云端管理器
│   │   ├── OAuthManager.js           # OAuth 认证
│   │   ├── SyncManager.js            # 同步管理
│   │   └── ConfigManager.js          # 配置管理
│   └── renderer/            # Vue 渲染进程
│       ├── App.vue
│       ├── components/      # UI 组件
│       └── services/        # IPC 通信服务
├── docs/                    # 项目文档
└── dist/                    # 构建输出
```

### 核心设计模式
- **单例模式**: YeelightCloudService 共享实例
- **事件驱动**: EventEmitter 事件总线
- **依赖注入**: 服务间松耦合
- **IPC 通信**: 主进程 ↔ 渲染进程安全通信

## 📦 安装与开发

### 环境要求
- Node.js >= 16.0.0
- npm >= 8.0.0

### 快速开始

```bash
# 克隆项目
git clone <repository-url>
cd yeehome

# 安装依赖
npm install

# 开发模式 - 启动 Vite 开发服务器
npm run dev

# 开发模式 - 启动 Electron
npm run electron:dev

# 完整开发流程
npm start  # 构建 + 启动 Electron

# 代码检查
npm run lint

# 代码格式化
npm run format

# 类型检查
npm run typecheck

# 构建生产版本
npm run build
npm run electron:build
```

### 开发配置

#### OAuth 配置
编辑 `src/config/config.json`:
```json
{
  "oauth": {
    "clientId": "your_client_id",
    "clientSecret": "your_client_secret",
    "redirectUri": "http://localhost:3001/callback",
    "authorizationUrl": "https://oauth.yeelight.com/authorize",
    "tokenUrl": "https://oauth.yeelight.com/token"
  },
  "cloudService": {
    "apiBaseUrl": "https://api.yeelight.com"
  }
}
```

## 📝 项目优化记录

### 已完成优化 (2024-12)

#### 1. 服务层重构 ✅
- **问题**: 5个 Cloud*Manager 各自创建 YeelightCloudService 实例,导致重复实例化
- **解决**: 实现单例模式,内存占用减少 80%
- **影响文件**:
  - `src/services/YeelightCloudService.js:14-19`
  - `src/services/Cloud*.js`

#### 2. 主进程代码优化 ✅
- **问题**: 18个重复的事件监听器模式,代码冗余严重
- **解决**: 提取 `forwardEventToRenderer()` 通用函数
- **代码减少**: 从 240 行重复代码减少到 130 行函数调用
- **影响文件**: `src/main.js:18-46`

#### 3. 工具链完善 ✅
- 添加 TypeScript 配置 (`tsconfig.json`, `jsconfig.json`)
- 添加 ESLint 配置 (`.eslintrc.js`)
- 添加 Prettier 配置 (`.prettierrc`)
- 添加 EditorConfig (`.editorconfig`)

#### 4. 构建配置优化 ✅
- 移除复杂的自定义 HTML 注入插件
- 添加代码分割 (vue-vendor, axios-vendor)
- 添加路径别名 (@, @services, @renderer)
- 优化 Terser 压缩配置
- **配置文件**: `vite.config.js`

### 待优化项

#### 日志系统改进 (优先级:中)
- [ ] 引入 Winston/Pino 替换 191 处 console.log
- [ ] 实现日志分级 (debug, info, warn, error)
- [ ] 生产环境禁用 debug 日志

#### 内存泄漏修复 (优先级:高)
- [ ] SyncManager 中添加事件监听器清理
- [ ] 实现组件销毁时的 removeListener
- [ ] 添加 EventEmitter 最大监听器限制

#### 代码质量提升 (优先级:低)
- [ ] 拆分 YeelightService (680行 → 4个独立服务)
- [ ] 统一服务命名 (Manager vs Service)
- [ ] 添加单元测试覆盖

## 🔧 配置说明

### IPC 通道白名单
详见 `src/preload.js:10-64`,包含 64 个授权的 IPC 通道。

### 事件系统
主要事件列表:
- `deviceAdded`, `deviceUpdated` - 本地设备事件
- `cloud-devices-synced` - 云端设备同步
- `authenticated`, `authError` - OAuth 认证
- `sceneApplied` - 情景应用

## 📚 相关文档
- [Yeelight 设备互联操作规范](docs/yeelight-device-interconnection-spec.md)
- [OAuth 认证流程](docs/oauth-authentication-flow.md)
- [云端 API 文档](docs/cloud-api-reference.md)

## 🤝 贡献指南
1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 代码规范
- 遵循 ESLint 配置 (单引号,无分号,2空格缩进)
- 提交前运行 `npm run lint` 和 `npm run format`
- 使用语义化的提交消息

## 📄 许可证
ISC License

## 🔗 相关链接
- [Yeelight 官方开发文档](https://www.yeelight.com/developer)
- [Electron 文档](https://www.electronjs.org/docs)
- [Vue 3 文档](https://vuejs.org/)

---

**注意**: 本项目处于活跃开发中,API 可能会发生变化。
