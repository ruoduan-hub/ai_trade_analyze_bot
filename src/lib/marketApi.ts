import type { TickerData, FearGreedData, NewsItem, MarketSnapshot } from '@/types'

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
  const res = await fetch(`https://api.coinpaprika.com/v1/tickers/${coinId}`)
  if (!res.ok) throw new Error(`CoinPaprika error for ${coinId}: ${res.status}`)
  const data: PaprikaTickerResponse = await res.json()
  const usd = data.quotes.USD
  return {
    price: usd.price,
    change24h: usd.percent_change_24h,
    volume24h: usd.volume_24h,
    marketCap: usd.market_cap,
  }
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
  const res = await fetch('https://api.alternative.me/fng/?limit=1')
  if (!res.ok) throw new Error(`Fear & Greed API error: ${res.status}`)
  const data: FearGreedResponse = await res.json()
  const item = data.data[0]
  return {
    value: parseInt(item.value, 10),
    valueText: item.value_classification,
    timestamp: item.timestamp,
  }
}

// ─── DeFiLlama ───────────────────────────────────────────────────────────────

interface LlamaChainResponse {
  tvl: number
  date: string
}

export async function fetchDefiTotalTvl(): Promise<number | null> {
  try {
    const res = await fetch('https://api.llama.fi/v2/historicalChainTvl/ethereum')
    if (!res.ok) return null
    const data: LlamaChainResponse[] = await res.json()
    if (!data || data.length === 0) return null
    return data[data.length - 1].tvl
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
  try {
    const res = await fetch(
      `https://data-api.coindesk.com/news/v1/article/list?lang=EN&limit=${limit}`,
    )
    if (!res.ok) return []
    const data: CoindeskResponse = await res.json()
    return (data?.Data?.Entries ?? []).map((a) => ({
      title: a.TITLE,
      url: a.URL,
      publishedAt: new Date(a.PUBLISHED_ON * 1000).toISOString(),
      source: a.SOURCE_INFO?.NAME,
    }))
  } catch {
    return []
  }
}

// ─── CCXT BYDFi price via API route (avoids browser bundling issues) ─────────

export async function fetchTickersViaCCXT(
  symbols: string[],
): Promise<Record<string, Partial<TickerData>>> {
  try {
    const res = await fetch('/api/market', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbols }),
    })
    if (!res.ok) return {}
    const data = await res.json() as { tickers: Record<string, Partial<TickerData>> }
    return data.tickers ?? {}
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
  const [ccxtTickers, fearGreed, defiTvl, news] = await Promise.allSettled([
    fetchTickersViaCCXT(symbols),
    fetchFearGreedIndex(),
    fetchDefiTotalTvl(),
    fetchLatestNews(6),
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

  return {
    tickers,
    fearGreed: fearGreed.status === 'fulfilled' ? fearGreed.value : null,
    news: news.status === 'fulfilled' ? news.value : [],
    defiTvl: defiTvl.status === 'fulfilled' ? (defiTvl.value ?? undefined) : undefined,
    fetchedAt: Date.now(),
  }
}
