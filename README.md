# CryptoAdvisor AI

加密货币投资智能顾问。选择币种、设定投资风格，结合实时行情与 AI 分析生成投资报告，支持一键通过 CCXT 下单。

**纯前端项目**，无后端，无数据库。历史数据存储于 IndexedDB。

---

## 快速开始

```bash
# 安装依赖
npm install

# 配置环境变量（复制后填入 AI API Key）
cp .env.example .env.local

# 启动开发服务器
npm run dev

# 生产构建
npm run build

# 类型检查
npm run type-check
```

---

## 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `CACHE_TIME` | 否 | 公共 API 默认缓存时长（分钟），缺省 `15` |

> AI API Key 在运行时由用户在设置面板中输入，存于 `sessionStorage`，不写入环境变量。

---

## 公共 API 数据源

所有外部 API 均**无需 API Key**，通过 Next.js `rewrites` 代理到 `/proxy/*` 避免 CORS 限制。

### 数据源列表

| 数据源 | 提供数据 | 代理前缀 | 缓存 TTL | 原始 Base URL |
|--------|---------|---------|---------|--------------|
| **CCXT / BYDFi** | 实时价格、24h 高低、成交量 | `/api/market`（API Route） | 1 min | — |
| **CoinPaprika** | 币种市值、补充价格数据 | `/proxy/coinpaprika` | 5 min | `https://api.coinpaprika.com` |
| **Alternative.me** | 恐惧贪婪指数（0–100） | `/proxy/alternative` | 15 min | `https://api.alternative.me` |
| **DeFiLlama** | 以太坊 DeFi 总 TVL | `/proxy/llama` | 15 min | `https://api.llama.fi` |
| **CoinDesk** | 最新加密市场新闻 | `/proxy/coindesk` | 10 min | `https://data-api.coindesk.com` |
| **CoinGecko** | 全球总市值、BTC/ETH 主导率、24h 变化 | `/proxy/coingecko` | 5 min | `https://api.coingecko.com` |
| **Binance Futures** | 资金费率（8h）、未平仓合约（OI） | `/proxy/binfutures` | 1 min | `https://fapi.binance.com` |
| **mempool.space** | BTC mempool 待确认交易数、推荐 Gas 费率 | `/proxy/mempool` | 2 min | `https://mempool.space` |

### 各数据源使用的端点

#### CCXT / BYDFi（通过 `/api/market` API Route）
```
POST /api/market
Body: { symbols: string[] }
→ 实时 ticker：price, change24h, volume24h, high24h, low24h
```

#### CoinPaprika
```
GET /proxy/coinpaprika/v1/tickers/{coin-id}
→ quotes.USD: price, volume_24h, market_cap, percent_change_24h
```

#### Alternative.me
```
GET /proxy/alternative/fng?limit=1
→ data[0]: value (0–100), value_classification, timestamp
```

#### DeFiLlama
```
GET /proxy/llama/v2/historicalChainTvl/ethereum
→ 最后一条: { tvl, date }
```

#### CoinDesk
```
GET /proxy/coindesk/news/v1/article/list?lang=EN&limit=6
→ Data.Entries[]: TITLE, URL, PUBLISHED_ON, SOURCE_INFO.NAME
```

#### CoinGecko
```
GET /proxy/coingecko/api/v3/global
→ data: total_market_cap.usd, market_cap_percentage.{btc,eth},
        market_cap_change_percentage_24h_usd, active_cryptocurrencies
```

#### Binance Futures（永续合约）
```
GET /proxy/binfutures/fapi/v1/premiumIndex?symbol={BTCUSDT}
→ lastFundingRate  （资金费率，8h 结算周期）

GET /proxy/binfutures/fapi/v1/openInterest?symbol={BTCUSDT}
→ openInterest（币种单位，需乘以价格换算为 USD）
```

#### mempool.space（BTC 链上）
```
GET /proxy/mempool/api/v1/fees/recommended
→ fastestFee, halfHourFee, hourFee（单位：sat/vB）

GET /proxy/mempool/api/mempool
→ count（待确认交易数）, vsize, total_fee
```

---


### 理论上可以用 CCXT 替代的（2 个）

| 当前方案 | CCXT 替代方法 | 说明 |
|---------|-------------|------|
| Binance Futures → 资金费率 | `exchange.fetchFundingRate(symbol)` | 需 futures 交易所支持 |
| Binance Futures → 未平仓合约 OI | `exchange.fetchOpenInterest(symbol)` | 同上 |

实际未替换的原因：BYDFi 不一定实现了这两个方法；若切换到 Binance 实例还需额外走 `/api/market` 路由（避免 bundle 问题），反而比直接代理 Binance 公开接口更复杂。

### 无法用 CCXT 替代的（6 个）

| 数据源 | 原因 |
|--------|------|
| **Alternative.me 恐惧贪婪指数** | 第三方计算的情绪指数，非交易所数据 |
| **DeFiLlama TVL** | 链上 DeFi 协议数据，需跨协议聚合 |
| **CoinDesk 新闻** | 媒体资讯，与交易所无关 |
| **CoinGecko 全球市值 / BTC 主导率** | 需聚合全市场（数千个交易所），单一交易所无法提供 |
| **CoinPaprika 市值** | 同上，需全市场聚合 |
| **mempool.space 链上数据** | Bitcoin 网络层数据，交易所不提供 |

---

## 缓存机制

缓存实现在 `src/lib/apiCache.ts`，使用 module-level `Map` 存储，TTL 到期自动失效。

- **浏览器端**：缓存在当前 tab session 内有效
- **服务端**：缓存在 Node.js 进程生命周期内跨请求复用
- **默认 TTL**：`CACHE_TIME` 环境变量（分钟），缺省 15 min

各数据源 TTL 见上表。调整全局默认值只需修改 `.env.local` 中的 `CACHE_TIME`。

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Next.js 14+ (App Router) |
| 语言 | TypeScript（严格模式） |
| 样式 | Tailwind CSS v3 |
| 交易所 | CCXT (`bydfi`) |
| 本地存储 | IndexedDB（via `idb`） |
| 图标 | Lucide React |
| 字体 | Orbitron / JetBrains Mono |

---

## 项目结构

```
src/
├── app/
│   ├── api/
│   │   ├── analyze/route.ts   # AI 分析（SSE 流式）
│   │   ├── market/route.ts    # CCXT 行情代理
│   │   └── order/route.ts     # 下单执行
│   ├── layout.tsx
│   ├── page.tsx               # 主页面
│   └── globals.css
├── components/                # UI 组件
├── lib/
│   ├── apiCache.ts            # 通用 TTL 缓存
│   ├── marketApi.ts           # 所有公共 API 封装（含缓存）
│   ├── indexdb.ts             # IndexedDB 历史记录
│   └── i18n.ts                # 中英文翻译字典
├── contexts/
│   └── LocaleContext.tsx      # 语言切换 Context
├── hooks/
└── types/
    └── index.ts               # 全局 TypeScript 类型
```
