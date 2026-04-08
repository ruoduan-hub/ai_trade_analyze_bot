export type AIProvider = 'openai' | 'anthropic' | 'glm'

export type InvestmentIntent = 'aggressive' | 'steady' | 'conservative'
export type InvestmentPeriod = 'short' | 'mid' | 'long'
export type OrderSide = 'buy' | 'sell'
export type OrderType = 'market' | 'limit'

export interface CryptoAsset {
  symbol: string       // e.g. 'BTC/USDT'
  id: string           // CoinPaprika id, e.g. 'btc-bitcoin'
  name: string
  shortName: string    // e.g. 'BTC'
  color: string        // brand color for UI
  price?: number
  change24h?: number
  volume24h?: number
}

export interface TickerData {
  symbol: string
  price: number
  change24h: number
  volume24h: number
  high24h: number
  low24h: number
  marketCap?: number
}

export interface FearGreedData {
  value: number
  valueText: string
  timestamp: string
}

export interface NewsItem {
  title: string
  url: string
  publishedAt: string
  source?: string
}

export interface GlobalMarketData {
  totalMarketCapUsd: number
  btcDominance: number
  ethDominance: number
  marketCapChange24hPercent: number
  activeCryptocurrencies: number
}

export interface BtcOnchainData {
  mempoolTxCount: number
  fastestFeeRate: number   // sat/vB
  halfHourFeeRate: number
  hourFeeRate: number
}

export interface MarketSnapshot {
  tickers: Record<string, TickerData>
  fearGreed: FearGreedData | null
  news: NewsItem[]
  defiTvl?: number
  globalMarket?: GlobalMarketData
  /** symbol (e.g. 'BTC/USDT') → 8h funding rate, e.g. 0.0001 = 0.01% */
  fundingRates?: Record<string, number>
  /** symbol → open interest in USD */
  openInterest?: Record<string, number>
  btcOnchain?: BtcOnchainData
  fetchedAt: number
}

export interface CCXTOrder {
  symbol: string
  type: OrderType
  side: OrderSide
  amount: number
  price?: number
  reasoning?: string
  /** 来自 MarketInfo.volumePrecision，用于下单时格式化数量小数位 */
  volumePrecision?: number
  params?: {
    stopLoss?: number
    takeProfit?: number
  }
}

export interface AnalysisRecord {
  id: string
  timestamp: number
  symbols: string[]
  intent: InvestmentIntent
  period: InvestmentPeriod
  amount: number
  marketSnapshot: MarketSnapshot
  report: string
  orders: CCXTOrder[]
  executed: boolean
  executedAt?: number
}

export interface InvestmentConfig {
  symbols: string[]
  intent: InvestmentIntent
  period: InvestmentPeriod
  amount: number
  locale?: string
  /** 用户自定义投资倾向描述（可选，最大 500 字符） */
  customTendency?: string
}

export interface AppSettings {
  provider: AIProvider
  apiKey: string
}
