# CryptoAdvisor AI — Claude Code 项目配置

## 项目概述

加密货币投资智能顾问，帮助用户选择币种、设定投资风格，结合实时行情与 AI 分析生成投资报告，并支持一键通过 CCXT 下单。

**纯前端项目**，无后端，无数据库。历史数据存储于 IndexedDB。所有的代码注释和沟通采用中文

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Next.js 14+ (App Router) |
| 语言 | TypeScript（严格模式） |
| 样式 | Tailwind CSS v3 |
| 交易所 | CCXT (`bydfi`) |
| AI | Anthropic SDK (`claude-sonnet-4-6`) |
| 本地存储 | IndexedDB（via `idb` 库） |
| 图标 | Lucide React（禁止用 emoji 作图标） |
| 字体 | Orbitron（标题）/ JetBrains Mono（正文/数据） |

---

## 设计系统

### 视觉风格
**Modern Dark Glassmorphism** — 金融科技 / 加密货币交易面板风格

### 色彩 Token
```css
--bg-deep:       #020203;          /* 最深背景，OLED 优化 */
--bg-base:       #050506;          /* 主背景 */
--bg-elevated:   #0a0a0c;          /* 卡片/模块背景 */
--surface:       rgba(255,255,255,0.05); /* 玻璃表面 */
--foreground:    #EDEDEF;          /* 主文字 */
--foreground-muted: #8A8F98;       /* 次要文字 */
--accent:        #5E6AD2;          /* 主色调（蓝紫） */
--accent-glow:   rgba(94,106,210,0.2);
--success:       #22C55E;          /* 看涨 / 成功 */
--warning:       #F59E0B;          /* 中性 / 警告 */
--danger:        #EF4444;          /* 看跌 / 危险 */
--border:        rgba(255,255,255,0.08);
--radius:        16px;
```

### 字体导入
```css
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Orbitron:wght@700;900&display=swap');
```
- 标题（h1–h3）：`font-family: 'Orbitron'`
- 数据 / 正文：`font-family: 'JetBrains Mono'`
- 数值必须使用 tabular-nums（`font-variant-numeric: tabular-nums`）

### 玻璃拟态卡片规范
```css
background: rgba(255,255,255,0.05);
backdrop-filter: blur(20px);
border: 1px solid rgba(255,255,255,0.08);
border-radius: 16px;
box-shadow: 0 8px 32px rgba(0,0,0,0.4);
```

### 动画规范
- 时长：micro 150ms / standard 250ms / complex 350ms
- Easing：`cubic-bezier(0.16, 1, 0.3, 1)`（弹出感）
- 按压反馈：`scale: 0.97 → 1.0`
- 必须支持 `prefers-reduced-motion`
- 禁止动画 width/height，仅用 transform + opacity

### 禁止事项（Anti-patterns）
- 禁止使用 emoji 作为图标
- 禁止 AI 紫粉渐变（显得廉价）
- 禁止纯 `#000000` 背景（OLED 涂抹感）
- 禁止 hover-only 交互（需支持 click/tap）

---

## 功能模块

### 1. 币种选择器 (`CryptoSelector`)
- 支持搜索过滤
- 显示币种 logo、名称、当前价格（CCXT 实时获取）
- 支持多选（最多 5 个）

### 2. 投资参数面板 (`InvestmentConfig`)
- **投资意向**：进取型 / 稳健型 / 保守型（单选）
- **投资周期**：短期（<1月） / 中期（1–6月） / 长期（>6月）（单选）
- **投资金额**：数字输入，单位 USDT

### 3. 行情数据获取（无需 API Key）

| 数据源 | 用途 | 代理前缀 | 缓存 TTL |
|--------|------|---------|---------|
| CCXT / BYDFi | 实时价格、K线、orderbook | `/api/market`（API Route） | 1 min |
| CoinPaprika | 币种补充价格 & 市值 | `/proxy/coinpaprika` | 5 min |
| DeFiLlama | 以太坊 DeFi TVL | `/proxy/llama` | 15 min |
| Alternative.me | 恐惧贪婪指数 | `/proxy/alternative` | 15 min |
| CoinDesk | 市场新闻 | `/proxy/coindesk` | 10 min |
| CoinGecko | 全球总市值、BTC/ETH 主导率 | `/proxy/coingecko` | 5 min |
| Binance Futures | 资金费率、未平仓合约（OI） | `/proxy/binfutures` | 1 min |
| mempool.space | BTC 链上 mempool 状态、推荐 Gas | `/proxy/mempool` | 2 min |

> **注意**：所有 API 调用在客户端完成，需处理 CORS。在 `next.config.ts` 中配置 rewrites 代理外部 API（避免 CORS 问题）。完整代理配置见 `next.config.ts`，完整 API 文档见 `README.md`。

---

## 缓存策略

### 架构说明
- 缓存实现：`src/lib/apiCache.ts` — module-level `Map<string, { data, expiresAt }>`
- 运行环境：在浏览器端（client component）和 Next.js server process 中均有效
  - **客户端**：缓存在 browser tab 生命周期内有效，切换 tab 或刷新页面后重置
  - **服务端**：缓存在 Node.js server process 生命周期内跨请求复用
- 默认 TTL：`CACHE_TIME` 环境变量（分钟），缺省 15 min（`parseInt` 失败时降级到 15）

### 使用规范
- **所有公共 API 函数必须在 `src/lib/marketApi.ts` 中接入缓存**，不得直接裸调用 `fetch` 而不检查缓存
- 格式：`getCached(key)` → 未命中则 `fetch` → `setCached(key, data, TTL.xxx)`
- Cache key 命名规范：`{source}-{resource}[-{param}]`，例如 `fear-greed`、`binance-funding-BTC/USDT`

### TTL 分级原则
| 级别 | TTL | 适用数据 |
|------|-----|---------|
| 高频 | 1 min | 实时价格、资金费率、未平仓合约 |
| 中频 | 2–5 min | BTC 链上数据、全球市场概览 |
| 低频 | 10–15 min | 新闻、恐惧贪婪指数、DeFi TVL |

### 新增 API 时必须同步
1. `next.config.ts` — 添加 `/proxy/{source}/:path*` rewrite
2. `src/lib/marketApi.ts` — 实现带缓存的 fetch 函数，选择对应 TTL 级别
3. `src/types/index.ts` — 若新增 `MarketSnapshot` 字段，同步更新类型
4. `src/app/api/analyze/route.ts` — 在 `buildPrompt()` 中加入新数据的 prompt 段落
5. `README.md` — 更新公共 API 列表

### 4. AI 分析报告 (`AnalysisReport`)
- 将以上所有市场数据组装为 prompt
- 调用 LangChain
- 报告结构：
  - 市场综合评估
  - 技术面分析
  - 基本面分析
  - 投资建议（买入/卖出/持有）
  - 风险提示
  - 目标价位（含止损、止盈）

**Prompt 模板结构**：
```
你是专业加密货币投资顾问。请根据以下数据，为投资风格为「{intent}」、
投资周期为「{period}」的用户分析「{symbols}」。

## 市场数据
{market_data}

## 输出要求
1. 市场综合评估...
6. 最终返回一个可直接用于 CCXT 下单的 JSON 数组（见格式说明）
```

### 5. 下单 JSON 预览 (`OrderPreview`)
AI 必须返回标准 CCXT 下单格式：
```json
[
  {
    "symbol": "BTC/USDT",
    "type": "limit",
    "side": "buy",
    "amount": 0.001,
    "price": 65000,
    "params": {
      "stopLoss": 62000,
      "takeProfit": 72000
    }
  }
]
```
- 展示 JSON 高亮预览
- 用户确认后输入 API Key（AES 加密存于 sessionStorage，绝不持久化）
- 调用 `ccxt.bydfi` 执行下单

### 6. 历史记录 (`HistoryPanel`)
- 每次分析结果自动写入 IndexedDB
- 显示：时间、币种、意向/周期、AI 评级
- 支持查看完整报告、对应下单 JSON
- 支持**单个删除**：列表项 hover 显示删除按钮，点击后内联确认（覆盖卡片），确认后从 IndexedDB 和本地 state 移除
- 支持**再次使用**：详情面板顶部"再次使用"按钮，点击后将历史记录的 symbols/intent/period/amount/report/orders 全部填充回主界面，自增 `analysisKey` 重置 OrderPreview，关闭历史面板，用户可直接重新下单
- 支持清除全部记录（需二次确认）

#### IndexedDB Schema
```typescript
interface AnalysisRecord {
  id: string;           // UUID
  timestamp: number;    // Date.now()
  symbols: string[];    // ['BTC/USDT', 'ETH/USDT']
  intent: 'aggressive' | 'steady' | 'conservative';
  period: 'short' | 'mid' | 'long';
  amount: number;
  marketData: MarketSnapshot;
  report: string;       // AI 返回的完整 Markdown 报告
  orderJson: CCXTOrder[];
  executed: boolean;
}
```

#### markets-cache（IndexedDB Store）
- 当前版本：`DB_VERSION = 4`，Store：`markets-cache`，keyPath：`key`（固定为 `'markets'`）
- TTL：3 天；过期或 DB 升级时自动清空，下次访问重新从 `/api/markets` 拉取
- 数据类型：`MarketOption[]`，每条记录包含：
  - `id`：交易所原生 id（如 `'BTC-USDT'`）
  - `baseId`：基础货币（如 `'BTC'`），用于显示
  - `symbol`：统一格式（如 `'BTC/USDT'`），用于下单
  - `info`：合约原始信息（类型 `MarketInfo`），含精度、手续费、杠杆等关键字段
- **升级规则**：凡修改 `MarketOption` 结构，必须升级 `DB_VERSION`，并在 `upgrade()` 中删除并重建 `markets-cache` store

---

## 项目目录结构

```
src/
├── app/
│   ├── layout.tsx          # 全局布局、字体、主题
│   ├── page.tsx            # 主页面（单页应用）
│   └── globals.css         # 设计 Token + 全局样式
├── components/
│   ├── CryptoSelector/
│   ├── InvestmentConfig/
│   ├── MarketDataPanel/
│   ├── AnalysisReport/
│   ├── OrderPreview/
│   ├── HistoryPanel/
│   └── ui/                 # 基础组件（Button, Card, Badge 等）
├── lib/
│   ├── ccxt.ts             # CCXT 初始化与交易方法
│   ├── marketApi.ts        # 各公共 API 封装
│   ├── claude.ts           # Anthropic SDK 调用
│   ├── indexdb.ts          # IndexedDB 读写封装（idb）
│   └── crypto.ts           # AES 加密工具（API Key 临时存储）
├── hooks/
│   ├── useMarketData.ts
│   ├── useAnalysis.ts
│   └── useHistory.ts
└── types/
    └── index.ts            # 全局 TypeScript 类型
```

---

## 安全规范

1. **API Key 处理**：用户输入的交易所 API Key 仅存于 `sessionStorage`，关闭标签即清除，绝不写入 localStorage / IndexedDB
2. **Anthropic API Key**：通过 Next.js `NEXT_PUBLIC_ANTHROPIC_API_KEY` 环境变量注入，`.env.local` 加入 `.gitignore`
3. **XSS 防护**：AI 报告内容通过 `react-markdown` 渲染，禁止 `dangerouslySetInnerHTML`
4. **CORS**：外部 API 通过 `next.config.js` rewrites 代理，避免暴露来源

---

## 代码规范

- TypeScript 严格模式，禁止 `any`，使用 `unknown` + 类型收窄
- 所有异步操作包裹 try/catch，向用户展示友好错误信息
- 组件单一职责，超过 150 行考虑拆分
- 数值格式化使用 `Intl.NumberFormat`，价格最多 8 位有效数字
- 颜色、间距、动画时长全部从 CSS Token 读取，禁止硬编码 hex
- 函数参数超过 3 个改为对象入参

---

## 环境变量

```env
# .env.local（不提交到 git）
NEXT_PUBLIC_ANTHROPIC_API_KEY=sk-ant-...
```

---

## 开发命令

```bash
npm run dev      # 启动开发服务器
npm run build    # 生产构建
npm run lint     # ESLint 检查
npm run type-check  # tsc --noEmit
```

---

## 关键依赖

```json
{
  "ccxt": "latest",
  "@anthropic-ai/sdk": "latest",
  "idb": "latest",
  "react-markdown": "latest",
  "lucide-react": "latest",
  "tailwindcss": "^3"
}
```

---

## 交付检查清单

- [ ] 所有图标使用 Lucide，无 emoji 图标
- [ ] 数值字段使用 `tabular-nums`
- [ ] 玻璃卡片 blur + border 一致
- [ ] 动画时长符合规范（150–350ms）
- [ ] 支持 `prefers-reduced-motion`
- [ ] API Key 不持久化
- [ ] AI 报告 Markdown 安全渲染
- [ ] IndexedDB 写入/读取/清除全部测试
- [ ] CCXT 下单前展示确认对话框
- [ ] 移动端响应（375px 最小宽度可用）

---

## 已实现的 UI 行为规范

### 布局
- 左侧 aside 支持折叠/展开（`PanelLeftClose` / `PanelLeftOpen` 图标），默认展开，宽度 `w-72`，折叠后 `w-12`，动画 300ms
- 右侧 Order Panel 宽度 `w-72 xl:w-80`
- 中间 main 区域 `min-w-0` 防止 flex 溢出

### 历史记录面板
- 从左侧滑入的 drawer（非底部 sheet），`fixed left-0 top-0 h-full`
- 列表宽 `w-72`，详情面板宽 `w-[480px]`，详情通过 `w-0 → w-[480px]` 动画展开
- backdrop 使用 opacity 过渡，不使用 `if (!isOpen) return null`（保留 DOM 以支持动画）
- 关闭面板时自动清空 `selected` 状态
- 单个删除：hover 显示 Trash2 图标，点击后在卡片上覆盖内联确认行，不弹 modal
- 再次使用：详情面板 header 右侧"再次使用"按钮（RotateCcw 图标），触发 `onReuse(record)` 回调后关闭面板；`page.tsx` 的 `handleReuseRecord` 负责填充所有状态

### 订单面板
- 每次新分析开始时通过 `key={analysisKey}` 重置 OrderPreview 组件（清除 `executed` 状态和旧订单）
- `analysisKey` 在 `handleAnalyze` 开头自增，`handleReuseRecord` 中同样自增以重置订单面板

### 动画
- `animate-fade-in` keyframe 已定义在 globals.css（translateY 8px → 0 + opacity）

---

## 国际化（i18n）

项目支持中文（zh）和英文（en）双语切换，切换按钮位于 Header 右侧，主题按钮左侧。

### 架构

| 文件 | 职责 |
|------|------|
| `src/lib/i18n.ts` | 所有翻译文本字典（zh / en），`as const` 保持类型精确 |
| `src/contexts/LocaleContext.tsx` | React Context + Provider + `useLocale()` Hook，locale 持久化到 `localStorage` |

### 使用规范

- **所有用户可见的文案**（按钮、标签、占位符、aria-label 等）必须从翻译字典取值，禁止硬编码中文或英文字符串
- 在组件顶部通过 `useLocale()` 获取 `{ t, locale, setLocale }`
- `t` 的结构与 `translations['zh']` 完全一致，按模块分层（`t.header`、`t.sidebar`、`t.settings` 等）
- `LocaleProvider` 包裹在 `page.tsx` 的根组件外层，所有子组件均可直接调用 `useLocale()`

### 新增文案流程

1. 在 `src/lib/i18n.ts` 的 `zh` 和 `en` 对象中**同时**添加对应 key
2. 保持两个语言的结构完全一致（TypeScript 会提示缺失 key）
3. 在组件中通过 `t.<section>.<key>` 引用，禁止直接写文字

### 翻译模块划分

| Key | 对应组件 |
|-----|---------|
| `t.header` | AppHeader |
| `t.sidebar` | AppSidebar |
| `t.cryptoSelector` | CryptoSelector |
| `t.investmentConfig` | InvestmentConfig（含 intents / periods 嵌套） |
| `t.analysisReport` | AnalysisReport |
| `t.orderPreview` | OrderPreview |
| `t.historyPanel` | HistoryPanel |
| `t.mobileTabBar` | MobileTabBar |
| `t.settings` | SettingsModal |
| `t.page` | page.tsx 内联文案 |

---

## SSR Hydration 闪烁问题（FOUC）根因与规范

### 根本原因

**凡是依赖 `localStorage` / `sessionStorage` / `matchMedia` 的客户端偏好（主题、语言等），若用 `useEffect` 异步读取并 `setState`，必然导致闪烁。**

时序：
1. 服务器渲染时 `window` 不存在 → 使用默认值（如 `'zh'`、`'dark'`）生成 HTML
2. 浏览器立即显示该 HTML（用户看到默认值）
3. JS 加载完毕，React hydrate，`useEffect` 才能读 `localStorage`
4. `setState` 触发重渲染 → 用户看到从默认值切换为实际偏好的闪烁

### 标准解法

偏好初始化分两类，处理方式不同：

#### 类型 A：纯 CSS 效果（如主题颜色）
- 内联 `<script>` 读 `localStorage`，在 React 加载前写入 `document.documentElement` 的 `data-*` 属性
- CSS `[data-theme]` 变量即时生效，无需 React 重渲染，无 FOUC

#### 类型 B：影响文本内容（如语言切换）
内联脚本 **不适用** ——原因：
1. React 警告 "Scripts inside React components are never executed when rendering on the client"（脚本在客户端组件内不执行）
2. 即使脚本运行，服务器 HTML 仍用默认语言渲染，客户端 JS 加载前会短暂显示错误语言

**正确方案：Cookie + 服务器读取**
1. 用户切换语言时写 Cookie：`document.cookie = 'locale=en; path=/; max-age=31536000'`
2. `layout.tsx`（Server Component）用 `cookies()` 读取 Cookie，直接在 `<html data-locale={locale}>` 上设置正确值
3. 服务器渲染的 HTML 已是正确语言 → React 客户端读取 `data-locale` 与服务器一致 → 无 mismatch → 无闪烁

```ts
// layout.tsx — 服务器端读 Cookie，SSR 直接输出正确语言
const cookieStore = await cookies();
const initialLocale = cookieStore.get("locale")?.value === "en" ? "en" : "zh";
// → <html data-locale="en"> (服务器渲染时已正确)

// LocaleContext — 同步读属性，首次渲染即正确，无 useEffect
function readInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'zh'
  const attr = document.documentElement.getAttribute('data-locale')
  return attr === 'en' || attr === 'zh' ? attr : 'zh'
}
const [locale, setLocaleState] = useState<Locale>(readInitialLocale)

// ❌ 错误：useEffect 异步，必然闪烁
useEffect(() => {
  const stored = localStorage.getItem('locale')
  if (stored) setLocaleState(stored)   // 触发重渲染 → 闪烁
}, [])
```

### 已落地的实现

| 偏好 | 存储 | 服务器读取 | `<html>` 属性 | 客户端读取 |
|------|------|----------|--------------|-----------|
| 主题 | `localStorage` | 不需要（纯 CSS） | `data-theme`（内联脚本写入） | `useTheme` useState + CSS 变量 |
| 语言 | Cookie | `cookies()` in layout.tsx | `data-locale`（SSR 直接设置） | `LocaleContext` `readInitialLocale()` |

### 规范：新增客户端偏好时必须遵循

- **影响文本/内容**的偏好（语言等）→ 必须用 Cookie + 服务器读取，禁止依赖 localStorage 内联脚本
- **纯 CSS 效果**的偏好（主题色等）→ 可用内联脚本 + localStorage，`useState(lazyFn)` 同步读取
- 任何情况下都禁止用 `useEffect` 读 `localStorage` 后 `setState` 来初始化偏好
