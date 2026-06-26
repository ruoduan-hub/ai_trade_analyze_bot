<div align="center">
  <h1>CryptoAdvisor AI</h1>

  <p><strong>AI-powered cryptocurrency investment advisor — market data, analysis reports, and one-click trading via CCXT.</strong></p>

  <p>
    <a href="https://github.com/ruoduan-hub/cryptoadvisor-ai/releases"><img src="https://img.shields.io/github/v/release/ruoduan-hub/cryptoadvisor-ai?color=111827&label=version" alt="Version"></a>
    <a href="https://github.com/ruoduan-hub/cryptoadvisor-ai/releases"><img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows-lightgrey.svg" alt="Platform"></a>
    <img src="https://img.shields.io/badge/Next.js-16-black?style=flat&logo=nextdotjs" alt="Next.js">
    <img src="https://img.shields.io/badge/TypeScript-5-blue?style=flat&logo=typescript" alt="TypeScript">
    <img src="https://img.shields.io/badge/Tailwind-4-06B6D4?style=flat&logo=tailwindcss" alt="Tailwind">
    <a href="./LICENSE"><img src="https://img.shields.io/github/license/ruoduan-hub/cryptoadvisor-ai?color=111827" alt="License"></a>
  </p>

  <p>
    English · <a href="./README.zh-CN.md">简体中文</a>
  </p>
</div>

CryptoAdvisor AI is a **pure frontend** crypto investment tool. Select coins, configure your risk profile, pull live market data from 8 public APIs, and get a streaming AI analysis report — complete with entry, stop-loss, and take-profit levels. When you're ready, execute the trade in one click through a CCXT-compatible exchange.

<p align="center">
  <img src="./docs/table-iMac.png" alt="CryptoAdvisor AI — Desktop" width="860">
</p>

<p align="center">
  <img src="./docs/mobile-iPhone%20X.png" alt="CryptoAdvisor AI — Mobile" width="320">
</p>

## Features

- **Multi-source Market Data** — Real-time prices, funding rates, open interest, Fear & Greed Index, on-chain data, and news from 8 public APIs.
- **Streaming AI Analysis** — SSE-powered report covering technicals, fundamentals, sentiment, and risk. Configurable risk profile and investment horizon.
- **One-click Trading** — AI generates CCXT-compatible order JSON with stop-loss and take-profit. Review, confirm, execute.
- **History & Replay** — Every analysis saved to IndexedDB. Replay past reports and re-submit orders.
- **Desktop App** — Packaged via Electron for macOS (universal) and Windows (x64).
- **Bilingual UI** — English and Simplified Chinese with zero-hydration-flicker language switching.
- **No Backend, No Database** — All data lives in the browser. Exchange credentials never leave your machine.

## Quick Start

### Prerequisites

- Node.js 18+
- An Anthropic API key (or compatible endpoint)

### Install

```bash
git clone https://github.com/ruoduan-hub/cryptoadvisor-ai.git
cd cryptoadvisor-ai

npm install
cp .env.example .env.local
# CACHE_TIME is optional; defaults to 15 (minutes)
```

### Dev

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run type-check   # TypeScript check
```

### Desktop App

```bash
npm run electron:dev          # Dev mode with hot reload
npm run electron:build:mac    # Build macOS .dmg (universal)
npm run electron:build:win    # Build Windows installer
```

## AI API Key

The AI API key is **not** set via environment variable. Users enter it in the Settings panel. The key is stored in `sessionStorage` only — cleared when the tab is closed, never persisted to disk or localStorage.

## Architecture

```
Browser / Electron
    │
    ├─ React 19 (App Router)
    │   ├─ CryptoSelector      — Search & select trading pairs
    │   ├─ InvestmentConfig     — Risk profile / timeframe / amount
    │   ├─ MarketDataPanel      — Real-time data dashboard
    │   ├─ AnalysisReport       — Streaming AI report (Markdown)
    │   ├─ OrderPreview         — CCXT JSON preview + execution
    │   └─ HistoryPanel         — IndexedDB records
    │
    ├─ Next.js API Routes
    │   ├─ /api/analyze         — AI streaming (SSE)
    │   ├─ /api/market          — CCXT ticker proxy
    │   ├─ /api/markets         — Available trading pairs
    │   └─ /api/order           — Order execution
    │
    ├─ External (via rewrites)
    │   ├─ /proxy/coinpaprika   — Market cap & prices
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

## Data Sources

All external APIs are **public** — no API key required. CORS is handled by Next.js `rewrites`.

| Source | Data | Proxy | Cache TTL |
| --- | --- | --- | --- |
| **CCXT (Exchange)** | Real-time tickers, 24h OHLC, volume | `/api/market` | 1 min |
| **CoinPaprika** | Market cap, supplementary prices | `/proxy/coinpaprika` | 5 min |
| **Alternative.me** | Fear & Greed Index (0–100) | `/proxy/alternative` | 15 min |
| **DeFiLlama** | Ethereum DeFi TVL | `/proxy/llama` | 15 min |
| **CoinDesk** | Crypto market news | `/proxy/coindesk` | 10 min |
| **CoinGecko** | Global market cap, BTC/ETH dominance | `/proxy/coingecko` | 5 min |
| **Binance Futures** | Funding rate (8h), open interest | `/proxy/binfutures` | 1 min |
| **mempool.space** | BTC mempool, recommended fees | `/proxy/mempool` | 2 min |

<details>
<summary>API endpoint details</summary>

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

## Project Structure

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

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 4 |
| AI | Anthropic SDK (Claude) |
| Exchange | CCXT |
| Local Storage | IndexedDB (via `idb`) |
| Desktop | Electron + electron-builder |
| Icons | Lucide React |
| Fonts | Orbitron / JetBrains Mono |

## Security

- **Exchange API keys** are stored in `sessionStorage` only — cleared when the tab is closed. Never written to localStorage, IndexedDB, or any persistent storage.
- **AI API key** is stored in `sessionStorage` only — same ephemeral model.
- **All external API calls** go through Next.js `rewrites` to avoid exposing the client IP.
- **AI report rendering** uses `react-markdown` — no `dangerouslySetInnerHTML`.
- **No server-side database** — all user data lives in the browser.

## Caching

Cache is implemented in `src/lib/apiCache.ts` as a module-level `Map<string, { data, expiresAt }>`.

- **Browser**: Cache lives for the tab session lifetime.
- **Server**: Cache is shared across requests within the Node.js process lifetime.
- **Default TTL**: `CACHE_TIME` env var (minutes), falls back to 15 min.

| Tier | TTL | Data Type |
| --- | --- | --- |
| High-frequency | 1 min | Real-time prices, funding rates, OI |
| Mid-frequency | 2–5 min | BTC on-chain, global market overview |
| Low-frequency | 10–15 min | News, Fear & Greed Index, DeFi TVL |

## Internationalization

English and Simplified Chinese are fully supported. The language switch lives in the header.

- **Translation dictionary**: `src/lib/i18n.ts` — all strings for both locales.
- **Server-side detection**: Locale is stored in a cookie and read by `layout.tsx` during SSR, ensuring **zero hydration flicker**.
- **Adding strings**: Add to both `zh` and `en` objects in `i18n.ts` — TypeScript enforces structural parity.

## License

MIT. See [`LICENSE`](./LICENSE).
