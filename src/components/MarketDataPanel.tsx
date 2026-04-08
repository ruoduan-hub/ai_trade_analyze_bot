'use client'

import { TrendingUp, TrendingDown, Activity, Newspaper } from 'lucide-react'
import type { MarketSnapshot } from '@/types'
import { Card } from './ui/Card'
import { Badge } from './ui/Badge'

/** 从 symbol 提取基础货币名称，兼容 'BTC-USDT' 和 'BTC/USDT:USDT' 两种格式 */
function getBaseFromSymbol(symbol: string): string {
  if (symbol.includes('/')) return symbol.split('/')[0] ?? symbol
  return symbol.split('-')[0] ?? symbol
}

interface Props {
  snapshot: MarketSnapshot
  selectedSymbols: string[]
}

function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString('en-US', { maximumFractionDigits: 2 })
  if (price >= 1) return price.toFixed(4)
  return price.toFixed(8)
}

function formatVolume(vol: number): string {
  if (vol >= 1e9) return `$${(vol / 1e9).toFixed(2)}B`
  if (vol >= 1e6) return `$${(vol / 1e6).toFixed(2)}M`
  if (vol >= 1e3) return `$${(vol / 1e3).toFixed(2)}K`
  return `$${vol.toFixed(2)}`
}

function getFearGreedColor(value: number): string {
  if (value <= 25) return 'text-danger'
  if (value <= 45) return 'text-warning'
  if (value <= 55) return 'text-foreground'
  return 'text-success'
}

export function MarketDataPanel({ snapshot, selectedSymbols }: Props) {
  const { tickers, fearGreed, news, defiTvl } = snapshot

  return (
    <div className="flex flex-col gap-4">
      {/* Ticker cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {selectedSymbols.map((symbol) => {
          const ticker = tickers[symbol]
          if (!ticker) return null

          const base = getBaseFromSymbol(symbol)
          const isUp = ticker.change24h >= 0
          return (
            <Card key={symbol} className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="size-5 rounded-full flex items-center justify-center text-[9px] font-bold bg-accent/10 text-accent">
                    {base.slice(0, 1)}
                  </span>
                  <span className="text-xs font-mono font-semibold text-foreground">
                    {base}
                  </span>
                </div>
                <Badge variant={isUp ? 'success' : 'danger'}>
                  {isUp ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                  {isUp ? '+' : ''}{ticker.change24h.toFixed(2)}%
                </Badge>
              </div>

              <div>
                <div className="text-lg font-mono font-bold tabular-nums text-foreground">
                  ${formatPrice(ticker.price)}
                </div>
                <div className="flex items-center gap-3 mt-1 text-[10px] font-mono text-muted">
                  <span>成交: {formatVolume(ticker.volume24h)}</span>
                  {ticker.marketCap && (
                    <span>市值: {formatVolume(ticker.marketCap)}</span>
                  )}
                </div>
              </div>

              {ticker.high24h > 0 && (
                <div className="flex items-center justify-between text-[10px] font-mono text-muted border-t border-themed-dim pt-2">
                  <span className="text-success/70">H: ${formatPrice(ticker.high24h)}</span>
                  <span className="text-danger/70">L: ${formatPrice(ticker.low24h)}</span>
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {/* Market Sentiment Row */}
      <div className="grid grid-cols-2 gap-3">
        {fearGreed && (
          <Card>
            <div className="flex items-center gap-2 mb-2">
              <Activity className="size-3.5 text-muted" />
              <span className="text-[10px] uppercase tracking-widest text-muted font-mono">
                恐惧贪婪指数
              </span>
            </div>
            <div className="flex items-end gap-2">
              <span className={`text-3xl font-heading font-bold tabular-nums ${getFearGreedColor(fearGreed.value)}`}>
                {fearGreed.value}
              </span>
              <span className="text-sm text-muted font-mono mb-1">{fearGreed.valueText}</span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-surface overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-danger via-warning to-success transition-all duration-700"
                style={{ width: `${fearGreed.value}%` }}
              />
            </div>
          </Card>
        )}

        {defiTvl && (
          <Card>
            <div className="flex items-center gap-2 mb-2">
              <Activity className="size-3.5 text-muted" />
              <span className="text-[10px] uppercase tracking-widest text-muted font-mono">
                ETH DeFi TVL
              </span>
            </div>
            <div className="text-2xl font-heading font-bold text-accent tabular-nums">
              ${(defiTvl / 1e9).toFixed(2)}B
            </div>
            <div className="text-[10px] text-muted font-mono mt-1">Total Value Locked</div>
          </Card>
        )}
      </div>

      {/* News */}
      {news.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Newspaper className="size-3.5 text-muted" />
            <span className="text-[10px] uppercase tracking-widest text-muted font-mono">
              最新资讯
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {news.slice(0, 4).map((item, i) => (
              <a
                key={i}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2 hover:opacity-80 transition-opacity group"
              >
                <span className="text-[10px] font-mono text-muted mt-0.5 flex-shrink-0">
                  {new Date(item.publishedAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                </span>
                <span className="text-xs font-mono text-foreground/80 group-hover:text-foreground line-clamp-2 leading-relaxed">
                  {item.title}
                </span>
              </a>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
