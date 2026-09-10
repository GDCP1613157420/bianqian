# 📝 桌面便签 Desktop Sticky Notes

一款轻量、简洁、可置顶的 Windows 桌面便签应用。

![界面预览](https://img.shields.io/badge/Platform-Windows-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## ✨ 功能特点

- 📌 **始终置顶** - 窗口可保持在桌面最顶层，不影响其他操作
- 📅 **按日期分组** - 便签按日期分开，方便按天管理
- 🎨 **多彩便签** - 支持 5 种便签颜色（黄/橙/绿/蓝/粉）
- 💾 **本地存储** - 数据保存在本地，不上传云端
- 🔒 **安全隐私** - 所有数据仅存储在本地
- ⬛ **系统托盘** - 关闭按钮最小化到托盘，不占用任务栏
- 📐 **自由拖动** - 可自由调整窗口大小和位置
- ⌨️ **快捷操作** - Ctrl+Enter 保存编辑，Esc 取消

## 🚀 快速开始

### 环境要求

- Windows 10/11
- Node.js 18+
- Rust 1.70+ (`https://rustup.rs`)

### 安装依赖

```bash
# 安装前端依赖
npm install

# 安装 Rust 依赖（自动）
cargo build
```

### 开发调试

```bash
npm run tauri dev
```

### 构建 exe

```bash
npm run tauri build
```

exe 文件输出位置：`src-tauri/target/release/桌面便签.exe`

## 📂 项目结构

```
desktop-sticky-notes/
├── src/                    # React 前端源码
│   ├── App.tsx            # 主应用组件
│   ├── main.tsx           # 入口文件
│   ├── types.ts           # 类型定义
│   ├── storage.ts         # 数据存储
│   └── index.css          # 全局样式
├── src-tauri/             # Tauri 后端
│   ├── src/               # Rust 源码
│   ├── icons/             # 应用图标
│   ├── tauri.conf.json    # Tauri 配置
│   └── Cargo.toml         # Rust 依赖
└── SPEC.md                # 功能规格说明
```

## 🖥️ 技术栈

- **前端**: React 18 + TypeScript + Vite + Tailwind CSS
- **后端**: Tauri v2 + Rust
- **构建**: Tauri Bundler (NSIS 安装包)

## 📄 许可证

MIT License

<!-- Pushed at 2026-09-10 15:27:52 to trigger build -->