// Electron 主进程
// 职责：启动 Next.js 服务器 → 创建 BrowserWindow 加载本地服务

const { app, BrowserWindow, shell } = require('electron')
const { createServer } = require('http')
const { parse } = require('url')
const path = require('path')
const net = require('net')

// 通过环境变量区分开发模式（concurrently 启动时 Next.js 已在 3000 端口就绪）
const isDev = process.env.ELECTRON_DEV === '1'
// debugMode 由 debug 打包命令通过 extraMetadata 注入到 package.json
const isDebug = isDev || (() => {
  try {
    return require(require('path').join(app.getAppPath(), 'package.json')).debugMode === true
  } catch { return false }
})()

let mainWindow = null

/** 查找可用端口（从 startPort 开始递增） */
function findAvailablePort(startPort) {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.listen(startPort, '127.0.0.1', () => {
      const port = server.address().port
      server.close(() => resolve(port))
    })
    server.on('error', () => resolve(findAvailablePort(startPort + 1)))
  })
}

/** 以编程方式启动 Next.js 生产服务器，返回实际监听的端口 */
async function startNextServer() {
  const port = await findAvailablePort(3690)

  // 兼容 CJS require：next 的默认导出是构造函数
  const nextModule = require('next')
  const createNextApp = nextModule.default ?? nextModule

  const nextApp = createNextApp({
    dev: false,
    dir: app.getAppPath(), // 指向 package.json 所在的应用根目录
    hostname: '127.0.0.1',
    port,
  })

  const handle = nextApp.getRequestHandler()
  await nextApp.prepare()

  await new Promise((resolve, reject) => {
    createServer((req, res) => {
      const parsedUrl = parse(req.url, true)
      handle(req, res, parsedUrl)
    })
      .listen(port, '127.0.0.1', () => {
        console.log(`[Electron] Next.js 已就绪 → http://127.0.0.1:${port}`)
        resolve()
      })
      .on('error', reject)
  })

  return port
}

/** 创建主窗口 */
function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 375,
    minHeight: 600,
    backgroundColor: '#050506', // 与设计系统 --bg-base 一致，防止白闪
    // macOS 隐藏标题栏，保留红绿灯按钮
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      nodeIntegration: false,   // 安全：禁止渲染进程直接访问 Node.js
      contextIsolation: true,   // 安全：隔离 preload 与页面上下文
      preload: path.join(__dirname, 'preload.js'),
    },
    show: false, // 内容就绪后再显示，避免白屏闪烁
  })

  const url = isDev ? 'http://localhost:3000' : `http://127.0.0.1:${port}`
  mainWindow.loadURL(url)

  // 内容渲染完毕后再显示窗口
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    if (isDebug) {
      mainWindow.webContents.openDevTools()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // 页面内的外部链接在系统默认浏览器打开，而非新 Electron 窗口
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://127.0.0.1') || url.startsWith('http://localhost')) {
      return { action: 'allow' }
    }
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

// ─── 应用生命周期 ─────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  let port = 3000

  if (!isDev) {
    try {
      port = await startNextServer()
    } catch (error) {
      console.error('[Electron] Next.js 启动失败:', error)
      app.quit()
      return
    }
  }

  createWindow(port)

  // macOS：点击 Dock 图标时若无窗口则重新创建
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(port)
    }
  })
})

// 非 macOS：所有窗口关闭时退出应用
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
