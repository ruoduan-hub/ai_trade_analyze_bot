# 打包体积优化方案

> 分析日期：2026-04-09
> 当前包体积：~1.1GB / 平台
> 预期优化后：< 200MB / 平台

---

## 问题诊断

### 当前体积分布

| 位置 | 大小 |
|------|------|
| `dist-electron/mac-arm64/` | 1.1GB |
| `.app/Contents/Resources/app/node_modules/` | 496MB |
| `.app/Contents/Resources/app/.next/` | 345MB |
| 本地 `node_modules/` | 1.2GB |

### 根本原因

#### 1. `node_modules/**/*` 全量打包（最严重）

`package.json` 的 `build.files` 配置了 `"node_modules/**/*"`，导致整个 1.2GB 的 `node_modules` 无差别地打进了 Electron 应用，包括所有 devDependencies。

```json
// 当前问题配置
"files": [
  "node_modules/**/*",   // ← 罪魁祸首
  ...
]
```

打包进去的 devDependency 举例：

| 包 | 大小 | 说明 |
|---|---|---|
| `app-builder-bin` | 207MB | 构建工具，运行时不需要 |
| `electron-winstaller` | 31MB | 构建工具，运行时不需要 |
| `typescript` | 23MB | 编译器，运行时不需要 |

#### 2. `asar: false` — 关闭了压缩归档

ASAR 格式类似 tar，可显著压缩文件体积。当前配置关闭后，所有文件以原始形态存放。

#### 3. `@langchain/community` 引入大量无用传递依赖

项目实际只使用 `@anthropic-ai/sdk`，但 `@langchain/community` 作为大杂烩包拉入了大量与本项目无关的依赖：

| 传递依赖 | 大小 | 实际用途 |
|---|---|---|
| `js-tiktoken` | 22MB | OpenAI Token 计数 |
| `openai` | 9.6MB | OpenAI SDK（项目未使用） |
| `playwright-core` | 9.6MB | 浏览器自动化 |
| `@browserbasehq` | 8.9MB | 云浏览器服务 |
| `@ibm-cloud` | 8.4MB | IBM 云 SDK |

#### 4. `ccxt` 包含 500+ 交易所实现

`ccxt` 56MB，但项目只使用 `bydfi` 一个交易所，其余实现全部冗余。

#### 5. `highlight.js` 全量引入

`highlight.js` 9.1MB，支持 190+ 语言高亮，但项目只需要少数几种语言。

---

## 优化方案

### 方案一：修复 electron-builder 配置 ⭐ 优先级最高

**预计节省：> 600MB**

修改 `package.json` 中的 `build` 配置：

```json
"build": {
  "appId": "com.aitrade.cryptoadvisor",
  "productName": "CryptoAdvisor AI",
  "copyright": "Copyright © 2026",
  "directories": {
    "output": "dist-electron"
  },
  "files": [
    "electron/**/*",
    ".next/**/*",
    "public/**/*",
    "package.json",
    "next.config.js",
    "tsconfig.json"
  ],
  "asar": true,
  ...
}
```

**关键点**：
- 移除 `"node_modules/**/*"`，让 `electron-builder` 自动处理依赖（只打包 `dependencies`，自动排除 `devDependencies`）
- 将 `asar` 改为 `true` 开启压缩归档

> **注意**：`electron-builder` 默认会根据 `package.json` 的 `dependencies` 字段自动打包运行时依赖，无需手动指定 `node_modules`。

---

### 方案二：移除 `@langchain/community`，直接使用 Anthropic SDK ⭐ 优先级高

**预计节省：~60MB**

项目已经依赖 `@anthropic-ai/sdk`，`@langchain/community` 只是增加了封装层和一大堆不需要的依赖。

```bash
npm uninstall @langchain/community @langchain/core
```

然后在 `src/lib/claude.ts` 中改为直接调用 `@anthropic-ai/sdk`：

```ts
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
})

export async function streamAnalysis(prompt: string, onChunk: (text: string) => void) {
  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  })

  for await (const chunk of stream) {
    if (
      chunk.type === 'content_block_delta' &&
      chunk.delta.type === 'text_delta'
    ) {
      onChunk(chunk.delta.text)
    }
  }

  return stream.finalMessage()
}
```

---

### 方案三：`highlight.js` 按需引入

**预计节省：~8MB（前端 chunk 减小）**

```ts
// 修改前（全量引入）
import hljs from 'highlight.js'

// 修改后（按需引入）
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import json from 'highlight.js/lib/languages/json'
import bash from 'highlight.js/lib/languages/bash'

hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('json', json)
hljs.registerLanguage('bash', bash)
```

> 也可以考虑改用 `rehype-highlight` 配合 `react-markdown` 的方式，只在需要时加载，已在项目依赖中存在。

---

### 方案四：`ccxt` 按交易所按需导入

**预计节省：~40MB**

```ts
// 修改前（全量引入，触发所有交易所加载）
import ccxt from 'ccxt'
const exchange = new ccxt.bydfi(config)

// 修改后（只引入 bydfi）
import { bydfi } from 'ccxt'
const exchange = new bydfi(config)
```

> 需验证 ccxt 是否支持此导入方式（部分版本支持具名导出）。若不支持，可在 `next.config.js` 的 webpack 配置中添加 externals 将 ccxt 保留在服务端，避免打入客户端 bundle。

---

## 执行顺序建议

```
方案一（electron-builder 配置）
  → 方案二（移除 @langchain/community）
    → 方案三（highlight.js 按需引入）
      → 方案四（ccxt 按需引入，可选）
```

方案一和方案二独立，可并行执行。方案三、四收益相对较小，作为后续优化。

---

## 执行后验证

```bash
# 重新构建并检查包体积
npm run electron:build:mac

# 检查 .next 静态 chunk 大小
du -sh .next/static/chunks/*.js | sort -rh | head -20

# 检查打包后 app 内 node_modules
du -sh "dist-electron/mac-arm64/CryptoAdvisor AI.app/Contents/Resources/app/"
```

目标：`.app/Contents/Resources/app/` 控制在 400MB 以内（含 Electron Chromium 运行时约 200MB）。
