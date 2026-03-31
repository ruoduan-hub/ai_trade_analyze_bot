'use client'

import { useState } from 'react'
import { ShoppingCart, AlertTriangle, CheckCircle2, Eye, EyeOff, Zap } from 'lucide-react'
import type { CCXTOrder } from '@/types'
import { Card } from './ui/Card'
import { Button } from './ui/Button'
import { Badge } from './ui/Badge'
import { placeOrders, type OrderResult } from '@/lib/ccxt-client'

interface Props {
  orders: CCXTOrder[]
  onOrdersExecuted: (results: OrderResult[]) => void
}

export function OrderPreview({ orders, onOrdersExecuted }: Props) {
  const [showApiForm, setShowApiForm] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [executeError, setExecuteError] = useState<string | null>(null)
  const [executed, setExecuted] = useState(false)

  async function handleExecute() {
    if (!apiKey || !apiSecret) return
    setIsExecuting(true)
    setExecuteError(null)
    try {
      const results = await placeOrders(orders, apiKey, apiSecret)
      setExecuted(true)
      onOrdersExecuted(results)
      setApiKey('')
      setApiSecret('')
      setShowApiForm(false)
    } catch (err) {
      setExecuteError(err instanceof Error ? err.message : '下单失败，请检查 API Key 和账户余额')
    } finally {
      setIsExecuting(false)
    }
  }

  if (orders.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center min-h-40 text-center gap-3">
        <ShoppingCart className="size-8 text-muted/30" />
        <p className="text-xs text-muted font-mono">分析完成后将在此显示订单</p>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingCart className="size-4 text-accent" />
          <span className="text-xs uppercase tracking-widest text-muted font-mono">建议订单</span>
        </div>
        <Badge variant="info">{orders.length} 笔</Badge>
      </div>

      {orders.map((order, i) => (
        <Card key={i} className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-mono font-semibold text-foreground">{order.symbol}</span>
            <div className="flex items-center gap-1.5">
              <Badge variant={order.side === 'buy' ? 'success' : 'danger'}>
                {order.side === 'buy' ? '买入' : '卖出'}
              </Badge>
              <Badge variant="neutral">{order.type === 'limit' ? '限价' : '市价'}</Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] font-mono">
            <div className="flex items-center justify-between">
              <span className="text-muted">数量</span>
              <span className="tabular-nums text-foreground">{order.amount}</span>
            </div>
            {order.price && (
              <div className="flex items-center justify-between">
                <span className="text-muted">价格</span>
                <span className="tabular-nums text-foreground">${order.price.toLocaleString()}</span>
              </div>
            )}
            {order.params?.stopLoss && (
              <div className="flex items-center justify-between">
                <span className="text-muted">止损</span>
                <span className="tabular-nums text-danger">${order.params.stopLoss.toLocaleString()}</span>
              </div>
            )}
            {order.params?.takeProfit && (
              <div className="flex items-center justify-between">
                <span className="text-muted">止盈</span>
                <span className="tabular-nums text-success">${order.params.takeProfit.toLocaleString()}</span>
              </div>
            )}
          </div>

          {order.reasoning && (
            <p className="text-[10px] text-muted font-mono leading-relaxed border-t border-themed-dim pt-2">
              {order.reasoning}
            </p>
          )}
        </Card>
      ))}

      {!executed && (
        <div className="flex flex-col gap-2">
          {!showApiForm ? (
            <Button variant="primary" size="md" className="w-full" onClick={() => setShowApiForm(true)}>
              <Zap className="size-4" />
              执行下单
            </Button>
          ) : (
            <Card className="flex flex-col gap-3 border border-warning/20 bg-warning/5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="size-4 text-warning flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-warning/80 font-mono leading-relaxed">
                  API Key 仅用于本次下单，不会持久存储，关闭页面即清除
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  placeholder="API Key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-themed text-xs font-mono text-foreground placeholder:text-muted focus:outline-none focus:border-accent/50 transition-colors"
                  autoComplete="off"
                />
                <div className="relative">
                  <input
                    type={showSecret ? 'text' : 'password'}
                    placeholder="API Secret"
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    className="w-full px-3 py-2 pr-10 rounded-xl bg-surface border border-themed text-xs font-mono text-foreground placeholder:text-muted focus:outline-none focus:border-accent/50 transition-colors"
                    autoComplete="off"
                  />
                  <button
                    onClick={() => setShowSecret((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
                    aria-label={showSecret ? '隐藏 Secret' : '显示 Secret'}
                  >
                    {showSecret ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </button>
                </div>
              </div>

              {executeError && (
                <p className="text-[10px] text-danger font-mono">{executeError}</p>
              )}

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={() => { setShowApiForm(false); setExecuteError(null) }}
                >
                  取消
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="flex-1"
                  loading={isExecuting}
                  disabled={!apiKey || !apiSecret}
                  onClick={handleExecute}
                >
                  确认下单
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}

      {executed && (
        <Card className="flex items-center gap-2 border border-success/20 bg-success/5">
          <CheckCircle2 className="size-4 text-success flex-shrink-0" />
          <span className="text-xs text-success font-mono">订单已成功提交至 BYDFi</span>
        </Card>
      )}
    </div>
  )
}
