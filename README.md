<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=nextdotjs" alt="Next.js">
  <img src="https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Tailwind-4-06B6D4?style=for-the-badge&logo=tailwindcss" alt="Tailwind">
  <img src="https://img.shields.io/badge/license-MIT-green?style=for-the-badge" alt="License">
</p>

<h1 align="center">CryptoAdvisor AI</h1>

<p align="center">
  <em>AI-powered cryptocurrency investment advisor — market data, analysis reports, and one-click trading via CCXT.</em>
  <br/>
  <em>AI 驱动的加密货币投资顾问 — 行情数据、分析报告、一键下单。</em>
</p>

---

## Table of Contents / 目录

- [Features / 功能](#features--功能)
- [Quick Start / 快速开始](#quick-start--快速开始)
- [Architecture / 架构](#architecture--架构)
- [Data Sources / 数据源](#data-sources--数据源)
- [Project Structure / 项目结构](#项目结构)
- [Tech Stack / 技术栈](#tech-stack--技术栈)
- [Security / 安全](#security--安全)
- [Caching / 缓存策略](#caching--缓存策略)
- [Internationalization / 国际化](#internationalization--国际化)
- [Desktop App / 桌面应用](#desktop-app--桌面应用)
- [License / 许可](#license--许可)

---

## Features / 功能

- **Multi-source Market Data** — Real-time prices, funding rates, open interest, fear & greed index, on-chain data, and news from 8 public APIs.
- **AI Analysis** — Streaming SSE report powered by Claude, covering technicals, fundamentals, sentiment, and risk.
- **One-click Trading** — Generates CCXT-compatible order JSON; confirm and execute directly via your exchange API key.
- **Bilingual** — English / Chinese UI with zero-hydration-flicker language switching.
- **History & Replay** — Every analysis saved locally (IndexedDB). Replay any past report and re-submit orders.
- **Desktop App** — Packaged via Electron for macOS and Windows.

> **多源行情数据** — 8 个公共 API 实时聚合价格、资金费率、未平仓合约、恐惧贪婪指数、链上数据及新闻。
> **AI 投资分析** — Claude 驱动的流式分析报告，涵盖技术面、基本面、情绪面和风险提示。
> **一键下单** — 生成 CCXT 标准订单 JSON，确认后通过交易所 API 执行。
> **双语界面** — 中英文无缝切换，零 hydration 闪烁。
> **历史回放** — 每次分析自动保存至 IndexedDB，支持回看报告、再次下单。
> **桌面应用** — 基于 Electron 打包，支持 macOS 和 Windows。

---

## Quick Start / 快速开始

### Prerequisites / 前置条件

- Node.js 18+
- An Anthropic API key (or compatible endpoint)

### Install / 安装

```bash
git clone https://github.com/<your-org>/cryptoadvisor-ai.git
cd cryptoadvisor-ai

npm install
cp .env.example .env.local
# Edit .env.local and set CACHE_TIME if needed (default: 15 min)
```

### AI API Key / AI 密钥

The AI API key is **not** set via environment variable. Instead, users enter it in the Settings panel (gear icon in the header). The key is stored in `sessionStorage` only — it is never persisted to disk, localStorage, or IndexedDB.

> AI 密钥**不**通过环境变量配置，用户在设置面板中输入，仅保存在 `sessionStorage` 中，关闭浏览器标签即清除。

### Dev / 开发

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run type-check   # TypeScript check
```

### Desktop App / 桌面应用

```bash
npm run electron:dev          # Dev mode with hot reload
npm run electron:build:mac    # Build macOS .dmg
npm run electron:build:win    # Build Windows installer
```

---

## Architecture / 架构

```
Browser / Electron
    │
    ├─ React 19 (App Router)
    │   ├─ CryptoSelector      — Search & select trading pairs
    │   ├─ InvestmentConfig     — Risk profile / timeframe / amount
    │   ├─ MarketDataPanel      — Real-time dashboard
    │   ├─ AnalysisReport       — Streaming AI report (Markdown)
    │   ├─ OrderPreview         — CCXT JSON + confirm + execute
    │   └─ HistoryPanel         — IndexedDB records
    │
    ├─ Next.js API Routes
    │   ├─ /api/analyze         — AI streaming (SSE)
    │   ├─ /api/market          — CCXT ticker proxy
    │   ├─ /api/markets         — Available trading pairs
    │   └─ /api/order           — Order execution
    │
    ├─ External (via rewrites)
    │   ├─ /proxy/coinpaprika   — Market cap & supplementary prices
    │   ├─ /proxy/alternative   — Fear & Greed Index
    │   ├─ /proxy/llama         — DeFi TVL
    │   ├─ /proxy/coindesk      — Market news
    │   ├─ /proxy/coingecko     — Global market overview
    │   ├─ /proxy/binfutures    — Funding rate & open interest
    │   └─ /proxy/mempool       — BTC on-chain mempool
    │
    └─ Storage
        ├─ IndexedDB            — Analysis history, markets cache
        ├─ sessionStorage       — Exchange API credentials (ephemeral)
        └─ localStorage         — Theme & locale preferences
```

---

## Data Sources / 数据源

All external APIs are **public** — no API key required. CORS is handled by Next.js `rewrites`.

> 所有外部 API 均为**公开接口**，无需 API Key，通过 Next.js `rewrites` 代理解决 CORS。

| Source / 数据源 | Data / 提供数据 | Proxy / 代理前缀 | Cache TTL |
|-----------------|----------------|-----------------|-----------|
| **CCXT (Exchange)** | Real-time tickers, 24h OHLC, volume | `/api/market` | 1 min |
| **CoinPaprika** | Market cap, supplementary prices | `/proxy/coinpaprika` | 5 min |
| **Alternative.me** | Fear & Greed Index (0–100) | `/proxy/alternative` | 15 min |
| **DeFiLlama** | Ethereum DeFi TVL | `/proxy/llama` | 15 min |
| **CoinDesk** | Crypto market news | `/proxy/coindesk` | 10 min |
| **CoinGecko** | Global market cap, BTC/ETH dominance | `/proxy/coingecko` | 5 min |
| **Binance Futures** | Funding rate (8h), open interest | `/proxy/binfutures` | 1 min |
| **mempool.space** | BTC mempool, recommended fees | `/proxy/mempool` | 2 min |

### API Endpoints / 端点详情

<details>
<summary>Click to expand / 点击展开</summary>

#### CCXT Exchange (via `/api/market`)
```
POST /api/market
Body: { symbols: string[] }
→ Ticker: price, change24h, volume24h, high24h, low24h
```

#### CoinPaprika
```
GET /proxy/coinpaprika/v1/tickers/{coin-id}
→ quotes.USD: price, volume_24h, market_cap, percent_change_24h
```

#### Alternative.me
```
GET /proxy/alternative/fng?limit=1
→ data[0]: value, value_classification, timestamp
```

#### DeFiLlama
```
GET /proxy/llama/v2/historicalChainTvl/ethereum
→ Last entry: { tvl, date }
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

#### Binance Futures
```
GET /proxy/binfutures/fapi/v1/premiumIndex?symbol={symbol}
→ lastFundingRate

GET /proxy/binfutures/fapi/v1/openInterest?symbol={symbol}
→ openInterest
```

#### mempool.space
```
GET /proxy/mempool/api/v1/fees/recommended
→ fastestFee, halfHourFee, hourFee (sat/vB)

GET /proxy/mempool/api/mempool
→ count, vsize, total_fee
```

</details>

### CCXT Coverage / CCXT 可替代性

| Status | Data | Notes |
|--------|------|-------|
| Replaceable via CCXT | Funding rate, Open interest | `exchange.fetchFundingRate()` / `exchange.fetchOpenInterest()` |
| Not replaceable | Fear & Greed Index, DeFi TVL, News, Global market cap, BTC dominance, CoinPaprika market cap, Mempool on-chain data | Third-party computed or multi-source aggregated |

---

## Project Structure / 项目结构

```
src/
├── app/
│   ├── api/
│   │   ├── analyze/route.ts    # AI analysis (SSE streaming)
│   │   ├── market/route.ts     # CCXT ticker proxy
│   │   ├── markets/route.ts    # Available trading pairs
│   │   └── order/route.ts      # Order execution
│   ├── layout.tsx              # Root layout, fonts, theme
│   ├── page.tsx                # Main SPA page
│   └── globals.css             # Design tokens + global styles
├── components/
│   ├── CryptoSelector/         # Trading pair search & selection
│   ├── InvestmentConfig/       # Risk profile & parameters
│   ├── MarketDataPanel/        # Real-time data dashboard
│   ├── AnalysisReport/         # Streaming AI report renderer
│   ├── OrderPreview/           # CCXT JSON preview & execution
│   ├── HistoryPanel/           # IndexedDB history viewer
│   └── ui/                     # Base components (Button, Card, Badge)
├── lib/
│   ├── apiCache.ts             # TTL cache (module-level Map)
│   ├── marketApi.ts            # Public API wrappers with caching
│   ├── indexdb.ts              # IndexedDB read/write (via idb)
│   ├── ccxt.ts                 # CCXT client initialization
│   ├── i18n.ts                 # EN/ZH translation dictionary
│   └── envConfig.ts            # Environment configuration
├── contexts/
│   └── LocaleContext.tsx       # Locale context & cookie sync
├── hooks/
│   ├── useMarketData.ts
│   ├── useAnalysis.ts
│   └── useHistory.ts
└── types/
    └── index.ts                # Global TypeScript definitions
```

---

## Tech Stack / 技术栈

| Layer / 层级 | Technology / 技术 |
|-------------|------------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 4 |
| AI | Anthropic SDK (Claude) |
| Exchange | CCXT (multi-exchange support) |
| Local Storage | IndexedDB (via `idb`) |
| Desktop | Electron + electron-builder |
| Icons | Lucide React |
| Fonts | Orbitron / JetBrains Mono |

---

## Security / 安全

- **Exchange API keys** are stored in `sessionStorage` only — cleared when the tab is closed. Never written to localStorage, IndexedDB, or any persistent storage.
- **AI API key** is stored in `sessionStorage` only — same ephemeral model.
- **All external API calls** go through Next.js `rewrites` to avoid exposing the client's IP to third-party services.
- **AI report rendering** uses `react-markdown` — no `dangerouslySetInnerHTML`.
- **No server-side database** — all user data lives in the browser.

> **交易所 API Key** 仅存储在 `sessionStorage` 中，关闭标签页即清除，绝不持久化。
> **AI 密钥**同样仅存储于 `sessionStorage`。
> **外部 API 调用**通过 Next.js `rewrites` 代理，避免客户端 IP 暴露。
> **AI 报告渲染**使用 `react-markdown`，禁止 `dangerouslySetInnerHTML`。
> **无服务端数据库** — 所有用户数据仅存在于浏览器端。

---

## Caching / 缓存策略

Cache is implemented in `src/lib/apiCache.ts` as a module-level `Map<string, { data, expiresAt }>`.

- **Browser**: Cache lives for the tab session lifetime.
- **Server**: Cache is shared across requests within the Node.js process lifetime.
- **Default TTL**: `CACHE_TIME` env var (minutes), falls back to 15 min.

| Tier / 级别 | TTL | Data Type / 数据类型 |
|------------|-----|-------------------|
| High-frequency / 高频 | 1 min | Real-time prices, funding rates, OI |
| Mid-frequency / 中频 | 2–5 min | BTC on-chain, global market overview |
| Low-frequency / 低频 | 10–15 min | News, Fear & Greed Index, DeFi TVL |

> 缓存实现在 `src/lib/apiCache.ts`，使用 module-level `Map` 存储，TTL 到期自动失效。
> 浏览器端：缓存在当前 tab session 内有效。服务端：缓存在 Node.js 进程生命周期内跨请求复用。

---

## Internationalization / 国际化

English and Chinese are fully supported. The language switch lives in the header.

- **Translation dictionary**: `src/lib/i18n.ts` — all strings for both locales.
- **Server-side detection**: Locale is stored in a cookie and read by `layout.tsx` during SSR, ensuring **zero hydration flicker**.
- **Adding strings**: Add to both `zh` and `en` objects in `i18n.ts` — TypeScript enforces structural parity.

> 完整支持英文和中文，切换按钮位于 Header 右侧。翻译字典位于 `src/lib/i18n.ts`。
> 语言偏好通过 Cookie + 服务端读取实现 SSR 时即输出正确语言，**零 hydration 闪烁**。

---

## Desktop App / 桌面应用

CryptoAdvisor AI can be packaged as a standalone desktop application using Electron.

```bash
# Development (hot reload)
npm run electron:dev

# Build macOS (.dmg, universal: x64 + arm64)
npm run electron:build:mac

# Build Windows (.exe installer + portable)
npm run electron:build:win
```

---

## License / 许可

MIT License — see [LICENSE](./LICENSE) for details.

---

<p align="center">
  <sub>Built with ❤️ for the crypto community. / 为加密社区打造。</sub>
</p>
