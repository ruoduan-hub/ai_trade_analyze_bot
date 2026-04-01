'use client'

import { useState } from 'react'
import { Search, CheckCircle2, Circle } from 'lucide-react'
import { useLocale } from '@/contexts/LocaleContext'
import type { CryptoAsset, TickerData } from '@/types'

export const SUPPORTED_ASSETS: CryptoAsset[] = [
  { symbol: 'BTC/USDT', id: 'btc-bitcoin', name: 'Bitcoin', shortName: 'BTC', color: '#F7931A' },
  { symbol: 'ETH/USDT', id: 'eth-ethereum', name: 'Ethereum', shortName: 'ETH', color: '#627EEA' },
  { symbol: 'SOL/USDT', id: 'sol-solana', name: 'Solana', shortName: 'SOL', color: '#9945FF' },
  { symbol: 'BNB/USDT', id: 'bnb-binance-coin', name: 'BNB', shortName: 'BNB', color: '#F3BA2F' },
  { symbol: 'XRP/USDT', id: 'xrp-xrp', name: 'XRP', shortName: 'XRP', color: '#00AAE4' },
  { symbol: 'DOGE/USDT', id: 'doge-dogecoin', name: 'Dogecoin', shortName: 'DOGE', color: '#C2A633' },
  { symbol: 'ADA/USDT', id: 'ada-cardano', name: 'Cardano', shortName: 'ADA', color: '#0033AD' },
  { symbol: 'AVAX/USDT', id: 'avax-avalanche', name: 'Avalanche', shortName: 'AVAX', color: '#E84142' },
  { symbol: 'DOT/USDT', id: 'dot-polkadot', name: 'Polkadot', shortName: 'DOT', color: '#E6007A' },
  { symbol: 'LINK/USDT', id: 'link-chainlink', name: 'Chainlink', shortName: 'LINK', color: '#2A5ADA' },
  { symbol: 'TON/USDT', id: 'ton-toncoin', name: 'Toncoin', shortName: 'TON', color: '#0098EA' },
  { symbol: 'SUI/USDT', id: 'sui-sui', name: 'Sui', shortName: 'SUI', color: '#6FBCF0' },
]

interface Props {
  selected: string[]
  onChange: (symbols: string[]) => void
  tickers: Record<string, TickerData>
}

export function CryptoSelector({ selected, onChange, tickers }: Props) {
  const [query, setQuery] = useState('')
  const { t } = useLocale()

  const filtered = SUPPORTED_ASSETS.filter(
    (a) =>
      a.name.toLowerCase().includes(query.toLowerCase()) ||
      a.shortName.toLowerCase().includes(query.toLowerCase()),
  )

  function toggle(symbol: string) {
    if (selected.includes(symbol)) {
      onChange([])
    } else {
      onChange([symbol])
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs uppercase tracking-widest text-muted font-mono">
          {t.cryptoSelector.title}
        </h3>
      </div>

      {/* Search */}
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

      {/* List */}
      <div className="flex flex-col gap-1 max-h-72 overflow-y-auto pr-0.5">
        {filtered.map((asset) => {
          const isSelected = selected.includes(asset.symbol)
          const ticker = tickers[asset.symbol]

          return (
            <button
              key={asset.symbol}
              onClick={() => toggle(asset.symbol)}
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
              {/* Color dot */}
              <span
                className="size-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold"
                style={{ backgroundColor: asset.color + '22', color: asset.color }}
              >
                {asset.shortName.slice(0, 1)}
              </span>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-mono font-medium text-foreground truncate">
                    {asset.shortName}
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
                  <span className="text-[10px] text-muted truncate">{asset.name}</span>
                  {ticker && (
                    <span className="text-[10px] font-mono tabular-nums text-muted">
                      ${ticker.price < 1 ? ticker.price.toFixed(6) : ticker.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}
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
        })}
      </div>

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {selected.map((sym) => {
            const asset = SUPPORTED_ASSETS.find((a) => a.symbol === sym)
            if (!asset) return null
            return (
              <button
                key={sym}
                onClick={() => toggle(sym)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono border transition-colors hover:opacity-70"
                style={{
                  borderColor: asset.color + '44',
                  backgroundColor: asset.color + '11',
                  color: asset.color,
                }}
                aria-label={`${t.cryptoSelector.removePrefix}${asset.name}`}
              >
                {asset.shortName}
                <span className="text-[8px] opacity-60">✕</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
