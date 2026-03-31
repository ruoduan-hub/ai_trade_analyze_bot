import { NextRequest, NextResponse } from 'next/server'
import ccxt from 'ccxt'
import type { CCXTOrder } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const { orders, apiKey, secret } = await req.json() as {
      orders: CCXTOrder[]
      apiKey: string
      secret: string
    }

    if (!apiKey || !secret) {
      return NextResponse.json({ error: 'apiKey and secret required' }, { status: 400 })
    }
    if (!Array.isArray(orders) || orders.length === 0) {
      return NextResponse.json({ error: 'orders required' }, { status: 400 })
    }

    const exchange = new ccxt.bydfi({ apiKey, secret, enableRateLimit: true })
    const results = []

    for (const order of orders) {
      const placed = await exchange.createOrder(
        order.symbol,
        order.type,
        order.side,
        order.amount,
        order.price,
        order.params,
      )
      results.push({
        id: placed.id,
        symbol: placed.symbol,
        side: placed.side,
        amount: placed.amount,
        price: placed.price,
        status: placed.status,
        timestamp: placed.timestamp ?? Date.now(),
      })
    }

    return NextResponse.json({ results })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Order failed' },
      { status: 500 },
    )
  }
}
