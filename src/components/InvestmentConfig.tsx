'use client'

import type { InvestmentIntent, InvestmentPeriod } from '@/types'

interface Props {
  intent: InvestmentIntent
  period: InvestmentPeriod
  amount: number
  onIntentChange: (v: InvestmentIntent) => void
  onPeriodChange: (v: InvestmentPeriod) => void
  onAmountChange: (v: number) => void
}

const INTENTS: { value: InvestmentIntent; label: string; sub: string; color: string }[] = [
  { value: 'aggressive', label: '进取', sub: '高风险·高回报', color: 'text-danger border-danger/30 bg-danger/5' },
  { value: 'steady', label: '稳健', sub: '中等风险', color: 'text-warning border-warning/30 bg-warning/5' },
  { value: 'conservative', label: '保守', sub: '低风险', color: 'text-success border-success/30 bg-success/5' },
]

const PERIODS: { value: InvestmentPeriod; label: string; sub: string }[] = [
  { value: 'short', label: '短期', sub: '<1月' },
  { value: 'mid', label: '中期', sub: '1~6月' },
  { value: 'long', label: '长期', sub: '>6月' },
]

export function InvestmentConfig({
  intent,
  period,
  amount,
  onIntentChange,
  onPeriodChange,
  onAmountChange,
}: Props) {
  return (
    <div className="flex flex-col gap-5">
      {/* Intent */}
      <div>
        <h3 className="text-xs uppercase tracking-widest text-muted font-mono mb-3">投资意向</h3>
        <div className="grid grid-cols-3 gap-2">
          {INTENTS.map((item) => (
            <button
              key={item.value}
              onClick={() => onIntentChange(item.value)}
              aria-pressed={intent === item.value}
              className={[
                'flex flex-col items-center gap-0.5 py-2.5 px-2 rounded-xl border text-center transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
                intent === item.value
                  ? item.color
                  : 'border-themed text-muted hover:border-themed hover:text-foreground hover:bg-surface',
              ].join(' ')}
            >
              <span className="text-xs font-mono font-semibold">{item.label}</span>
              <span className="text-[9px] opacity-70">{item.sub}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Period */}
      <div>
        <h3 className="text-xs uppercase tracking-widest text-muted font-mono mb-3">投资周期</h3>
        <div className="grid grid-cols-3 gap-2">
          {PERIODS.map((item) => (
            <button
              key={item.value}
              onClick={() => onPeriodChange(item.value)}
              aria-pressed={period === item.value}
              className={[
                'flex flex-col items-center gap-0.5 py-2.5 px-2 rounded-xl border text-center transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
                period === item.value
                  ? 'border-accent/40 bg-accent/10 text-accent'
                  : 'border-themed text-muted hover:text-foreground hover:bg-surface',
              ].join(' ')}
            >
              <span className="text-xs font-mono font-semibold">{item.label}</span>
              <span className="text-[9px] opacity-70">{item.sub}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Amount */}
      <div>
        <h3 className="text-xs uppercase tracking-widest text-muted font-mono mb-3">投资金额</h3>
        <div className="relative">
          <input
            type="number"
            min={1}
            step={100}
            value={amount}
            onChange={(e) => onAmountChange(Math.max(1, Number(e.target.value)))}
            className="w-full pr-16 pl-4 py-2.5 rounded-xl bg-surface border border-themed text-sm font-mono text-foreground placeholder:text-muted focus:outline-none focus:border-accent/50 transition-colors tabular-nums"
            aria-label="投资金额 USDT"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted font-mono select-none">
            USDT
          </span>
        </div>
        {/* Quick presets */}
        <div className="flex gap-1.5 mt-2">
          {[100, 500, 1000, 5000].map((preset) => (
            <button
              key={preset}
              onClick={() => onAmountChange(preset)}
              className={[
                'flex-1 py-1 rounded-lg text-[10px] font-mono transition-colors border',
                amount === preset
                  ? 'bg-accent/20 text-accent border-accent/30'
                  : 'bg-surface text-muted hover:text-foreground border-themed',
              ].join(' ')}
            >
              {preset >= 1000 ? `${preset / 1000}K` : preset}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
