'use client'

import { useLocale } from '@/contexts/LocaleContext'
import type { InvestmentIntent, InvestmentPeriod } from '@/types'

interface Props {
  intent: InvestmentIntent
  period: InvestmentPeriod
  amount: number
  onIntentChange: (v: InvestmentIntent) => void
  onPeriodChange: (v: InvestmentPeriod) => void
  onAmountChange: (v: number) => void
}

const INTENT_COLORS: Record<InvestmentIntent, string> = {
  aggressive: 'text-danger border-danger/30 bg-danger/5',
  steady: 'text-warning border-warning/30 bg-warning/5',
  conservative: 'text-success border-success/30 bg-success/5',
}

const INTENT_VALUES: InvestmentIntent[] = ['aggressive', 'steady', 'conservative']
const PERIOD_VALUES: InvestmentPeriod[] = ['short', 'mid', 'long']

export function InvestmentConfig({
  intent,
  period,
  amount,
  onIntentChange,
  onPeriodChange,
  onAmountChange,
}: Props) {
  const { t } = useLocale()

  return (
    <div className="flex flex-col gap-5">
      {/* Intent */}
      <div>
        <h3 className="text-xs uppercase tracking-widest text-muted font-mono mb-3">
          {t.investmentConfig.intentTitle}
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {INTENT_VALUES.map((value) => {
            const item = t.investmentConfig.intents[value]
            return (
              <button
                key={value}
                onClick={() => onIntentChange(value)}
                aria-pressed={intent === value}
                className={[
                  'flex flex-col items-center gap-0.5 py-2.5 px-2 rounded-xl border text-center transition-all duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
                  intent === value
                    ? INTENT_COLORS[value]
                    : 'border-themed text-muted hover:border-themed hover:text-foreground hover:bg-surface',
                ].join(' ')}
              >
                <span className="text-xs font-mono font-semibold">{item.label}</span>
                <span className="text-[9px] opacity-70">{item.sub}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Period */}
      <div>
        <h3 className="text-xs uppercase tracking-widest text-muted font-mono mb-3">
          {t.investmentConfig.periodTitle}
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {PERIOD_VALUES.map((value) => {
            const item = t.investmentConfig.periods[value]
            return (
              <button
                key={value}
                onClick={() => onPeriodChange(value)}
                aria-pressed={period === value}
                className={[
                  'flex flex-col items-center gap-0.5 py-2.5 px-2 rounded-xl border text-center transition-all duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
                  period === value
                    ? 'border-accent/40 bg-accent/10 text-accent'
                    : 'border-themed text-muted hover:text-foreground hover:bg-surface',
                ].join(' ')}
              >
                <span className="text-xs font-mono font-semibold">{item.label}</span>
                <span className="text-[9px] opacity-70">{item.sub}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Amount */}
      <div>
        <h3 className="text-xs uppercase tracking-widest text-muted font-mono mb-3">
          {t.investmentConfig.amountTitle}
        </h3>
        <div className="relative">
          <input
            type="number"
            min={1}
            step={100}
            value={amount}
            onChange={(e) => onAmountChange(Math.max(1, Number(e.target.value)))}
            className="w-full pr-16 pl-4 py-2.5 rounded-xl bg-surface border border-themed text-sm font-mono text-foreground placeholder:text-muted focus:outline-none focus:border-accent/50 transition-colors tabular-nums"
            aria-label={t.investmentConfig.amountAriaLabel}
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
