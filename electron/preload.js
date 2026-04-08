// Preload 脚本：在隔离环境中向渲染进程安全暴露 Electron API
// 只暴露最小必要的接口，遵循最小权限原则

const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // 当前操作系统平台，供 UI 做平台差异化处理（如 macOS 标题栏偏移）
  platform: process.platform,
  // 应用版本号
  version: process.env.npm_package_version ?? '0.1.0',
})
