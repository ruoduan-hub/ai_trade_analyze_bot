import type {
  TickerData,
  FearGreedData,
  NewsItem,
  MarketSnapshot,
  GlobalMarketData,
  BtcOnchainData,
} from '@/types'
import { getCached, setCached } from '@/lib/apiCache'

// Per-source cache TTL (ms)
const TTL = {
  fearGreed:    15 * 60 * 1000,   // 15 min — updates once per day
  defiTvl:      15 * 60 * 1000,   // 15 min — slow-moving
  globalMarket:  5 * 60 * 1000,   //  5 min — BTC dominance shifts gradually
  news:         10 * 60 * 1000,   // 10 min — news cadence is medium
  paprika:       5 * 60 * 1000,   //  5 min — supplementary price data
  ccxtTickers:   1 * 60 * 1000,   //  1 min — primary real-time prices
  fundingRate:   1 * 60 * 1000,   //  1 min — changes on every funding cycle
  openInterest:  1 * 60 * 1000,   //  1 min — high-frequency derivatives data
  btcOnchain:    2 * 60 * 1000,   //  2 min — mempool changes quickly
} as const

// ─── CoinPaprika ─────────────────────────────────────────────────────────────

interface PaprikaTickerResponse {
  id: string
  name: string
  symbol: string
  quotes: {
    USD: {
      price: number
      volume_24h: number
      market_cap: number
      percent_change_24h: number
      percent_change_7d: number
    }
  }
}

export async function fetchCoinPaprikaTicker(coinId: string): Promise<Partial<TickerData>> {
  const key = `paprika-${coinId}`
  const cached = getCached<Partial<TickerData>>(key)
  if (cached) return cached

  const res = await fetch(`/proxy/coinpaprika/v1/tickers/${coinId}`)
  // 402 = CoinPaprika free tier no longer covers this endpoint
  if (res.status === 402 || res.status === 401 || res.status === 403) return {}
  if (!res.ok) throw new Error(`CoinPaprika error for ${coinId}: ${res.status}`)
  const data: PaprikaTickerResponse = await res.json()
  const usd = data.quotes.USD
  const result: Partial<TickerData> = {
    price: usd.price,
    change24h: usd.percent_change_24h,
    volume24h: usd.volume_24h,
    marketCap: usd.market_cap,
  }
  setCached(key, result, TTL.paprika)
  return result
}

// ─── Alternative.me Fear & Greed ─────────────────────────────────────────────

interface FearGreedResponse {
  data: Array<{
    value: string
    value_classification: string
    timestamp: string
  }>
}

export async function fetchFearGreedIndex(): Promise<FearGreedData> {
  const cached = getCached<FearGreedData>('fear-greed')
  if (cached) return cached

  const res = await fetch('/proxy/alternative/fng?limit=1')
  if (!res.ok) throw new Error(`Fear & Greed API error: ${res.status}`)
  const data: FearGreedResponse = await res.json()
  const item = data.data[0]
  const result: FearGreedData = {
    value: parseInt(item.value, 10),
    valueText: item.value_classification,
    timestamp: item.timestamp,
  }
  setCached('fear-greed', result, TTL.fearGreed)
  return result
}

// ─── DeFiLlama ───────────────────────────────────────────────────────────────

interface LlamaChainResponse {
  tvl: number
  date: string
}

export async function fetchDefiTotalTvl(): Promise<number | null> {
  const cached = getCached<number>('defi-tvl-ethereum')
  if (cached !== null) return cached

  try {
    const res = await fetch('/proxy/llama/v2/historicalChainTvl/ethereum')
    if (!res.ok) return null
    const data: LlamaChainResponse[] = await res.json()
    if (!data || data.length === 0) return null
    const tvl = data[data.length - 1].tvl
    setCached('defi-tvl-ethereum', tvl, TTL.defiTvl)
    return tvl
  } catch {
    return null
  }
}

// ─── CoinDesk News ───────────────────────────────────────────────────────────

interface CoindeskArticle {
  TITLE: string
  URL: string
  PUBLISHED_ON: number
  SOURCE_INFO?: { NAME?: string }
}

interface CoindeskResponse {
  Data: { Entries: CoindeskArticle[] }
}

export async function fetchLatestNews(limit = 6): Promise<NewsItem[]> {
  const key = `news-${limit}`
  const cached = getCached<NewsItem[]>(key)
  if (cached) return cached

  try {
    const res = await fetch(
      `/proxy/coindesk/news/v1/article/list?lang=EN&limit=${limit}`,
    )
    if (!res.ok) return []
    const data: CoindeskResponse = await res.json()
    const result = (data?.Data?.Entries ?? []).map((a) => ({
      title: a.TITLE,
      url: a.URL,
      publishedAt: new Date(a.PUBLISHED_ON * 1000).toISOString(),
      source: a.SOURCE_INFO?.NAME,
    }))
    setCached(key, result, TTL.news)
    return result
  } catch {
    return []
  }
}

// ─── CoinGecko Global Market ──────────────────────────────────────────────────

interface CoinGeckoGlobalResponse {
  data: {
    active_cryptocurrencies: number
    total_market_cap: { usd: number }
    market_cap_change_percentage_24h_usd: number
    market_cap_percentage: { btc: number; eth: number }
  }
}

export async function fetchGlobalMarket(): Promise<GlobalMarketData | null> {
  const cached = getCached<GlobalMarketData>('global-market')
  if (cached) return cached

  try {
    const res = await fetch('/proxy/coingecko/api/v3/global')
    if (!res.ok) return null
    const data: CoinGeckoGlobalResponse = await res.json()
    const d = data.data
    const result: GlobalMarketData = {
      totalMarketCapUsd: d.total_market_cap.usd,
      btcDominance: d.market_cap_percentage.btc,
      ethDominance: d.market_cap_percentage.eth,
      marketCapChange24hPercent: d.market_cap_change_percentage_24h_usd,
      activeCryptocurrencies: d.active_cryptocurrencies,
    }
    setCached('global-market', result, TTL.globalMarket)
    return result
  } catch {
    return null
  }
}

// ─── Binance Perpetual Futures ────────────────────────────────────────────────

// Maps CCXT symbol → Binance futures symbol (e.g. 'BTC/USDT' → 'BTCUSDT')
function toBinanceSymbol(ccxtSymbol: string): string {
  return ccxtSymbol.replace('/', '')
}

interface BinancePremiumIndexResponse {
  symbol: string
  lastFundingRate: string
  nextFundingTime: number
  markPrice: string
}

export async function fetchBinanceFundingRates(
  symbols: string[],
): Promise<Record<string, number>> {
  const result: Record<string, number> = {}
  await Promise.all(
    symbols.map(async (symbol) => {
      const key = `binance-funding-${symbol}`
      const cached = getCached<number>(key)
      if (cached !== null) {
        result[symbol] = cached
        return
      }
      try {
        const binSym = toBinanceSymbol(symbol)
        const res = await fetch(`/proxy/binfutures/fapi/v1/premiumIndex?symbol=${binSym}`)
        if (!res.ok) return
        const data: BinancePremiumIndexResponse = await res.json()
        const rate = parseFloat(data.lastFundingRate)
        if (!isNaN(rate)) {
          result[symbol] = rate
          setCached(key, rate, TTL.fundingRate)
        }
      } catch {
        // not all symbols have perpetual futures
      }
    }),
  )
  return result
}

interface BinanceOpenInterestResponse {
  symbol: string
  openInterest: string
  time: number
}

export async function fetchBinanceOpenInterest(
  symbols: string[],
): Promise<Record<string, number>> {
  const result: Record<string, number> = {}
  await Promise.all(
    symbols.map(async (symbol) => {
      const key = `binance-oi-${symbol}`
      const cached = getCached<number>(key)
      if (cached !== null) {
        result[symbol] = cached
        return
      }
      try {
        const binSym = toBinanceSymbol(symbol)
        const res = await fetch(`/proxy/binfutures/fapi/v1/openInterest?symbol=${binSym}`)
        if (!res.ok) return
        const data: BinanceOpenInterestResponse = await res.json()
        const oi = parseFloat(data.openInterest)
        if (!isNaN(oi)) {
          result[symbol] = oi
          setCached(key, oi, TTL.openInterest)
        }
      } catch {
        // not all symbols have perpetual futures
      }
    }),
  )
  return result
}

// ─── Mempool.space BTC On-chain ───────────────────────────────────────────────

interface MempoolFeesResponse {
  fastestFee: number
  halfHourFee: number
  hourFee: number
  economyFee: number
  minimumFee: number
}

interface MempoolStatsResponse {
  count: number
  vsize: number
  total_fee: number
}

export async function fetchBtcOnchain(): Promise<BtcOnchainData | null> {
  const cached = getCached<BtcOnchainData>('btc-onchain')
  if (cached) return cached

  try {
    const [feesRes, mempoolRes] = await Promise.all([
      fetch('/proxy/mempool/api/v1/fees/recommended'),
      fetch('/proxy/mempool/api/mempool'),
    ])
    if (!feesRes.ok || !mempoolRes.ok) return null
    const fees: MempoolFeesResponse = await feesRes.json()
    const mempool: MempoolStatsResponse = await mempoolRes.json()
    const result: BtcOnchainData = {
      mempoolTxCount: mempool.count,
      fastestFeeRate: fees.fastestFee,
      halfHourFeeRate: fees.halfHourFee,
      hourFeeRate: fees.hourFee,
    }
    setCached('btc-onchain', result, TTL.btcOnchain)
    return result
  } catch {
    return null
  }
}

// ─── CCXT BYDFi price via API route (avoids browser bundling issues) ─────────

export async function fetchTickersViaCCXT(
  symbols: string[],
): Promise<Record<string, Partial<TickerData>>> {
  const key = `ccxt-tickers-${[...symbols].sort().join(',')}`
  const cached = getCached<Record<string, Partial<TickerData>>>(key)
  if (cached) return cached

  try {
    const res = await fetch('/api/market', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbols }),
    })
    if (!res.ok) return {}
    const data = await res.json() as { tickers: Record<string, Partial<TickerData>> }
    const result = data.tickers ?? {}
    setCached(key, result, TTL.ccxtTickers)
    return result
  } catch {
    return {}
  }
}

// ─── Aggregator ──────────────────────────────────────────────────────────────

// Maps CCXT symbol → CoinPaprika ID
const PAPRIKA_ID_MAP: Record<string, string> = {
  'BTC/USDT': 'btc-bitcoin',
  'ETH/USDT': 'eth-ethereum',
  'SOL/USDT': 'sol-solana',
  'BNB/USDT': 'bnb-binance-coin',
  'XRP/USDT': 'xrp-xrp',
  'DOGE/USDT': 'doge-dogecoin',
  'ADA/USDT': 'ada-cardano',
  'AVAX/USDT': 'avax-avalanche',
  'DOT/USDT': 'dot-polkadot',
  'LINK/USDT': 'link-chainlink',
  'TON/USDT': 'ton-toncoin',
  'SUI/USDT': 'sui-sui',
}

export async function fetchAllMarketData(symbols: string[]): Promise<MarketSnapshot> {
  const [ccxtTickers, fearGreed, defiTvl, news, globalMarket, fundingRates, oiRaw, btcOnchain] =
    await Promise.allSettled([
      fetchTickersViaCCXT(symbols),
      fetchFearGreedIndex(),
      fetchDefiTotalTvl(),
      fetchLatestNews(6),
      fetchGlobalMarket(),
      fetchBinanceFundingRates(symbols),
      fetchBinanceOpenInterest(symbols),
      fetchBtcOnchain(),
    ])

  const ccxtData = ccxtTickers.status === 'fulfilled' ? ccxtTickers.value : {}

  const tickers: Record<string, TickerData> = {}

  await Promise.all(
    symbols.map(async (symbol) => {
      const ccxt = ccxtData[symbol]
      let paprika: Partial<TickerData> = {}

      const paprikaId = PAPRIKA_ID_MAP[symbol]
      if (paprikaId) {
        try {
          paprika = await fetchCoinPaprikaTicker(paprikaId)
        } catch {
          // fallback to ccxt only
        }
      }

      tickers[symbol] = {
        symbol,
        price: ccxt?.price ?? paprika.price ?? 0,
        change24h: ccxt?.change24h ?? paprika.change24h ?? 0,
        volume24h: ccxt?.volume24h ?? paprika.volume24h ?? 0,
        high24h: ccxt?.high24h ?? 0,
        low24h: ccxt?.low24h ?? 0,
        marketCap: paprika.marketCap,
      }
    }),
  )

  // Convert open interest from coin units to USD using fetched prices
  let openInterest: Record<string, number> | undefined
  if (oiRaw.status === 'fulfilled' && Object.keys(oiRaw.value).length > 0) {
    openInterest = {}
    for (const [symbol, oiInCoins] of Object.entries(oiRaw.value)) {
      const price = tickers[symbol]?.price ?? 0
      openInterest[symbol] = oiInCoins * price
    }
  }

  return {
    tickers,
    fearGreed: fearGreed.status === 'fulfilled' ? fearGreed.value : null,
    news: news.status === 'fulfilled' ? news.value : [],
    defiTvl: defiTvl.status === 'fulfilled' ? (defiTvl.value ?? undefined) : undefined,
    globalMarket:
      globalMarket.status === 'fulfilled' ? (globalMarket.value ?? undefined) : undefined,
    fundingRates:
      fundingRates.status === 'fulfilled' && Object.keys(fundingRates.value).length > 0
        ? fundingRates.value
        : undefined,
    openInterest,
    btcOnchain:
      btcOnchain.status === 'fulfilled' ? (btcOnchain.value ?? undefined) : undefined,
    fetchedAt: Date.now(),
  }
}
