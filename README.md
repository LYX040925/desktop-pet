# 🐕 Desktop Pet - 线条小狗马尔济斯

一个基于 Electron + Canvas 的桌面宠物应用，主角是一只可爱的线条风格马尔济斯犬。

![Electron](https://img.shields.io/badge/Electron-28-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## ✨ 功能特性

- 🎨 **像素风格渲染** — 16×16 像素画，Canvas 逐帧绘制，保持像素级清晰
- 🧠 **有限状态机** — 13 种行为状态，自然流畅的 AI 动作切换
- 🐾 **丰富动作** — 待机、行走、坐下、睡觉、吃零食、抓痒、打哈欠、张望等
- 💤 **粒子特效** — 睡觉时飘出 Z ★ Z 粒子，生动可爱
- 🖱️ **鼠标交互** — 悬停显示宠物、拖拽移动、右键喂零食
- 🖥️ **桌面集成** — 透明无边框窗口，始终置顶，不干扰正常工作
- 📐 **屏幕边缘检测** — 宠物走到屏幕边缘时自动切换方向

## 🎮 操作说明

| 操作 | 效果 |
|------|------|
| 鼠标悬停在宠物上 | 宠物抬头看向鼠标 |
| 点击宠物 | 宠物会高兴地跳起来 |
| 拖拽宠物 | 移动宠物到桌面任意位置 |
| 右键点击 | 在宠物面前放置零食 |

## 🚀 快速开始

### 环境要求

- Node.js >= 16
- npm

### 安装与运行

```bash
# 克隆项目
git clone https://github.com/LYX040925/desktop-pet.git
cd desktop-pet

# 安装依赖
npm install

# 启动开发模式
npm run dev
```

或者使用启动脚本（推荐，避免环境变量问题）：

```bash
# Windows Batch
.\start.bat

# PowerShell
.\start.ps1
```

### 构建生产版本

```bash
npm run build
```

## 🏗️ 项目结构

```
desktop-pet/
├── src/
│   ├── main/                  # Electron 主进程
│   │   ├── index.ts           # 窗口创建、IPC 通信
│   │   └── preload.ts         # 预加载脚本，暴露安全 API
│   ├── renderer/              # 渲染进程
│   │   ├── index.html         # 入口 HTML
│   │   ├── main.ts            # 渲染入口，初始化画布
│   │   ├── sprites.ts         # 所有像素画数据（16×16）
│   │   └── engine/
│   │       └── PetEngine.ts   # 核心引擎（状态机 + 渲染 + 交互）
│   └── shared/                # 共享配置
│       ├── types.ts           # TypeScript 类型定义
│       └── constants.ts       # 常量配置
├── resources/                 # 应用图标
├── electron.vite.config.ts    # 构建配置
├── start.bat                  # Windows 启动脚本
└── start.ps1                  # PowerShell 启动脚本
```

## ⚙️ 技术栈

- **Electron 28** — 跨平台桌面应用框架
- **electron-vite** — 基于 Vite 的 Electron 构建工具
- **TypeScript 5.6** — 类型安全的 JavaScript
- **Canvas 2D API** — 像素级渲染

## 🔧 配置

核心配置在 [constants.ts](src/shared/constants.ts)：

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `spriteScale` | 4 | 精灵缩放倍数 |
| `walkSpeed` | 60px/s | 行走速度 |
| `idleDuration` | [2000, 5000]ms | 待机状态随机持续时间 |
| `sleepTimeout` | 15000ms | 无操作后进入睡眠的时间 |

## 📝 License

MIT
