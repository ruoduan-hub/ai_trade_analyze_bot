'use client'

import { useState, useEffect } from 'react'
import { Search, CheckCircle2, Circle, Loader2 } from 'lucide-react'
import { useLocale } from '@/contexts/LocaleContext'
import type { TickerData } from '@/types'
import type { MarketOption } from '@/app/api/markets/route'
import { getCachedMarkets, setCachedMarkets } from '@/lib/indexdb'
import { loadTradeEnv } from '@/lib/envConfig'

interface Props {
  /** 当前选中的 market id 数组（CCXT 交易所原生 id，如 'BTC-USDT'） */
  selected: string[]
  onChange: (ids: string[]) => void
  /** key: CCXT 统一 symbol（如 'BTC/USDT:USDT'），value: 对应行情数据 */
  tickers: Record<string, TickerData>
  /** 可选：markets 加载完成后通知父组件，用于 ID→symbol 映射 */
  onMarketsLoaded?: (markets: MarketOption[]) => void
}

export function CryptoSelector({ selected, onChange, tickers, onMarketsLoaded }: Props) {
  const [query, setQuery] = useState('')
  const [markets, setMarkets] = useState<MarketOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { t } = useLocale()

  useEffect(() => {
    let cancelled = false

    async function loadMarkets() {
      setLoading(true)
      setError(null)
      try {
        // 优先读 IndexedDB 缓存（3 天内有效）
        const cached = await getCachedMarkets()
        if (cached && cached.length > 0) {
          if (!cancelled) {
            setMarkets(cached)
            onMarketsLoaded?.(cached)
          }
          return
        }

        // 缓存过期或不存在，从 API 拉取
        const res = await fetch(`/api/markets?env=${loadTradeEnv()}`)
        if (!res.ok) throw new Error(`获取市场失败: ${res.status}`)
        const json = await res.json() as { markets: MarketOption[] }

        if (!cancelled) {
          setMarkets(json.markets)
          onMarketsLoaded?.(json.markets)
          await setCachedMarkets(json.markets)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '加载市场数据失败')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadMarkets()
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = markets.filter((m) =>
    m.baseId.toLowerCase().includes(query.toLowerCase()),
  )

  function toggle(id: string) {
    if (selected.includes(id)) {
      onChange([])
    } else {
      onChange([id])
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs uppercase tracking-widest text-muted font-mono">
          {t.cryptoSelector.title}
        </h3>
      </div>

      {/* 搜索框 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.cryptoSelector.searchPlaceholder}
          className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface border border-themed text-xs font-mono text-foreground placeholder:text-muted focus:outline-none focus:border-accent/50 transition-colors"
        />
      </div>

      {/* 加载中 */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-8 text-muted text-xs font-mono">
          <Loader2 className="size-4 animate-spin" />
          <span>加载市场数据...</span>
        </div>
      )}

      {/* 加载失败 */}
      {!loading && error && (
        <div className="text-danger text-xs font-mono px-3 py-4 text-center">
          {error}
        </div>
      )}

      {/* 列表 */}
      {!loading && !error && (
        <div className="flex flex-col gap-1 max-h-72 overflow-y-auto pr-0.5">
          {filtered.length === 0 ? (
            <div className="text-muted text-xs font-mono text-center py-6">
              无匹配币种
            </div>
          ) : (
            filtered.map((market) => {
              const isSelected = selected.includes(market.id)
              // tickers 以 CCXT symbol 为 key，通过 market.symbol 查找
              const ticker = tickers[market.symbol]

              return (
                <button
                  key={market.id}
                  onClick={() => toggle(market.id)}
                  aria-pressed={isSelected}
                  className={[
                    'flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all duration-150',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
                    isSelected
                      ? 'bg-accent/10 border border-accent/20'
                      : 'hover:bg-surface border border-transparent',
                    'cursor-pointer',
                  ].join(' ')}
                >
                  {/* 首字母头像 */}
                  <span className="size-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold bg-accent/10 text-accent">
                    {market.baseId.slice(0, 1)}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      {/* 显示 baseId（如 'BTC'） */}
                      <span className="text-xs font-mono font-medium text-foreground truncate">
                        {market.baseId}
                      </span>
                      {ticker && (
                        <span
                          className={`text-[10px] font-mono tabular-nums ${ticker.change24h >= 0 ? 'text-success' : 'text-danger'}`}
                        >
                          {ticker.change24h >= 0 ? '+' : ''}{ticker.change24h.toFixed(2)}%
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      {/* 副标题显示 CCXT 统一 symbol */}
                      <span className="text-[10px] text-muted truncate">{market.symbol}</span>
                      {ticker && (
                        <span className="text-[10px] font-mono tabular-nums text-muted">
                          ${ticker.price < 1
                            ? ticker.price.toFixed(6)
                            : ticker.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>
                  </div>

                  {isSelected ? (
                    <CheckCircle2 className="size-4 text-accent flex-shrink-0" />
                  ) : (
                    <Circle className="size-4 text-muted/30 flex-shrink-0" />
                  )}
                </button>
              )
            })
          )}
        </div>
      )}

      {/* 已选 chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {selected.map((id) => {
            const market = markets.find((m) => m.id === id)
            if (!market) return null
            return (
              <button
                key={id}
                onClick={() => toggle(id)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono border border-accent/30 bg-accent/10 text-accent transition-colors hover:opacity-70"
                aria-label={`${t.cryptoSelector.removePrefix}${market.baseId}`}
              >
                {market.baseId}
                <span className="text-[8px] opacity-60">✕</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}