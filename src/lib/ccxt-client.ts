import type { CCXTOrder } from '@/types'

export interface OrderResult {
  id: string
  symbol: string
  side: string
  amount: number
  price?: number
  status: string
  timestamp: number
}

export async function placeOrders(
  orders: CCXTOrder[],
  apiKey: string,
  secret: string,
): Promise<OrderResult[]> {
  const res = await fetch('/api/order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orders, apiKey, secret }),
  })
  const data = await res.json() as { results?: OrderResult[]; error?: string }
  if (!res.ok || data.error) {
    throw new Error(data.error ?? `下单失败 (${res.status})`)
  }
  return data.results ?? []
}
