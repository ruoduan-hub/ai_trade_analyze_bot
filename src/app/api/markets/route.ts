import { NextRequest, NextResponse } from 'next/server'
import ccxt from 'ccxt'

/** BYDFi 合约原始 info 字段 */
export interface MarketInfo {
  symbol: string            // 合约代码，如 'BTC-USDT'
  baseAsset: string         // 基础货币符号
  marginAsset: string       // 保证金资产
  quoteAsset: string        // 计价货币符号
  contractFactor: number | null   // 合约价值
  limitMaxQty: number | null      // 限价最大委托张数
  limitMinQty: number | null      // 限价最小委托张数
  marketMaxQty: number | null     // 市价最大委托张数
  marketMinQty: number | null     // 市价最小委托张数
  pricePrecision: number          // 价格精度
  basePrecision: number           // 基础货币精度
  feeRateTaker: string            // taker 手续费
  feeRateMaker: string            // maker 手续费
  liqFeeRate: string              // 强平手续费
  openBuyLimitRateMax: string     // 开仓买单限价最大比例
  openSellLimitRateMax: string    // 开仓卖单限价最大比例
  openBuyLimitRateMin: string     // 开仓买单限价最小比例
  openSellLimitRateMin: string    // 开仓卖单限价最小比例
  priceOrderPrecision: number     // 下单单位
  baseShowPrecision: number       // 前端展示单位
  maxLeverageLevel: number        // 最大杠杆倍数
  volumePrecision: number         // 委托数量精度
  maxLimitOrderNum: number        // 最多订单数限制
  maxPlanOrderNum: number         // 最多条件单订单限制
  reverse: boolean                // 是否反向合约（币本位）
  onboardTime: number | null      // 上线时间
  status: string                  // 合约状态：NORMAL / STOP / REMOVED 等
  [key: string]: unknown          // 兼容未知扩展字段
}

export interface MarketOption {
  id: string       // 交易所原生 id，如 'BTC-USDT'
  baseId: string   // 基础货币，如 'BTC'，用于显示
  symbol: string   // 统一格式，如 'BTC/USDT'
  info: MarketInfo // 合约原始信息（精度、手续费、杠杆等）
}

export async function GET(req: NextRequest) {
  try {
    const env = req.nextUrl.searchParams.get('env')
    const apiUrl = env === 'production'
      ? 'https://api.bydfi.com/api'
      : 'https://api.bydtms.com/api'

    const exchange = new ccxt.bydfi({
      enableRateLimit: true,
      urls: { api: { public: apiUrl, private: apiUrl } },
    })
    const rawMarkets = await exchange.fetchMarkets()

    const filtered: MarketOption[] = rawMarkets
      .filter((m): m is NonNullable<typeof m> & { id: string; symbol: string } => {
        if (!m || !m.id || !m.symbol) return false
        const info = m.info as Record<string, unknown> | undefined
        const status = info?.['status'] ?? (m as unknown as Record<string, unknown>)['status']
        return m.swap === true && status === 'NORMAL'
      })
      .map((m) => {
        const base = (m.base ?? m.baseId ?? m.id.split('-')[0]) as string
        const quote = (m.quote ?? m.quoteId ?? m.id.split('-')[1]) as string
        return {
          id: m.id,
          baseId: base,
          // 使用 base/quote 格式（如 'BTC/USDT'），不带 settlement 后缀
          // 与下单路由 symbol.replace('/', '-') 保持一致
          symbol: `${base}/${quote}`,
          info: (m.info ?? {}) as MarketInfo,
        }
      })
      // 按 baseId 字母排序，方便搜索
      .sort((a, b) => a.baseId.localeCompare(b.baseId))

    return NextResponse.json({ markets: filtered })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '获取市场数据失败' },
      { status: 500 },
    )
  }
}