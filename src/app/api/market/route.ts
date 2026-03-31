import { NextRequest, NextResponse } from 'next/server'
import ccxt from 'ccxt'

export async function POST(req: NextRequest) {
  try {
    const { symbols } = await req.json() as { symbols: string[] }
    if (!Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json({ error: 'symbols required' }, { status: 400 })
    }

    const exchange = new ccxt.bydfi({ enableRateLimit: true })
    const results: Record<string, unknown> = {}

    await Promise.all(
      symbols.map(async (symbol: string) => {
        try {
          const ticker = await exchange.fetchTicker(symbol)
          results[symbol] = {
            symbol,
            price: ticker.last ?? ticker.close ?? 0,
            change24h: ticker.percentage ?? 0,
            volume24h: ticker.quoteVolume ?? ticker.baseVolume ?? 0,
            high24h: ticker.high ?? 0,
            low24h: ticker.low ?? 0,
          }
        } catch {
          // skip failed symbols silently
        }
      }),
    )

    return NextResponse.json({ tickers: results })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    )
  }
}
