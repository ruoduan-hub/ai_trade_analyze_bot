# CryptoAdvisor AI — Claude Code 项目配置

## 项目概述

加密货币投资智能顾问，帮助用户选择币种、设定投资风格，结合实时行情与 AI 分析生成投资报告，并支持一键通过 CCXT 下单。

**纯前端项目**，无后端，无数据库。历史数据存储于 IndexedDB。

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

| 数据源 | 用途 | 端点示例 |
|--------|------|---------|
| CCXT / BYDFi | 实时价格、K线、orderbook | `exchange.fetchTicker('BTC/USDT')` |
| CoinPaprika | 币种基本信息、历史数据 | `https://api.coinpaprika.com/v1/tickers/{id}` |
| DeFiLlama | TVL、DeFi 生态数据 | `https://api.llama.fi/protocols` |
| Alternative.me | 恐惧贪婪指数 | `https://api.alternative.me/fng/` |
| CoinDesk | 市场新闻 | `https://data-api.coindesk.com/news/v1/article/list` |

> **注意**：所有 API 调用在客户端完成，需处理 CORS。在 `next.config.js` 中配置 rewrites 代理外部 API（避免 CORS 问题）。

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
