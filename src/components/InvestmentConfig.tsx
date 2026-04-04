'use client'

import { useState, useRef, useEffect } from 'react'
import { SlidersHorizontal, X, Sparkles, Check } from 'lucide-react'
import { useLocale } from '@/contexts/LocaleContext'
import type { InvestmentIntent, InvestmentPeriod } from '@/types'

interface Props {
  intent: InvestmentIntent
  period: InvestmentPeriod
  amount: number
  customTendency?: string
  onIntentChange: (v: InvestmentIntent) => void
  onPeriodChange: (v: InvestmentPeriod) => void
  onAmountChange: (v: number) => void
  onCustomTendencyChange: (v: string) => void
}

const INTENT_COLORS: Record<InvestmentIntent, string> = {
  aggressive: 'text-danger border-danger/30 bg-danger/5',
  steady: 'text-warning border-warning/30 bg-warning/5',
  conservative: 'text-success border-success/30 bg-success/5',
}

const INTENT_VALUES: InvestmentIntent[] = ['aggressive', 'steady', 'conservative']
const PERIOD_VALUES: InvestmentPeriod[] = ['short', 'mid', 'long']
const MAX_CHARS = 500

/** 自定义投资偏好弹窗 */
function CustomTendencyModal({
  isOpen,
  value,
  onClose,
  onSave,
}: {
  isOpen: boolean
  value: string
  onClose: () => void
  onSave: (v: string) => void
}) {
  const { t } = useLocale()
  const [draft, setDraft] = useState(value)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const tc = t.investmentConfig.customTendency

  // 打开时重置 draft 并聚焦
  useEffect(() => {
    if (isOpen) {
      setDraft(value)
      setTimeout(() => textareaRef.current?.focus(), 50)
    }
  }, [isOpen, value])

  // ESC 关闭
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  function handleSave() {
    onSave(draft.trim())
    onClose()
  }

  function handleClear() {
    setDraft('')
    textareaRef.current?.focus()
  }

  const remaining = MAX_CHARS - draft.length
  const isOverLimit = remaining < 0

  return (
    <>
      {/* Backdrop — 与 SettingsModal 保持一致 */}
      <div
        className={[
          'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-250',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal panel — 使用主题 CSS token，深色/浅色均兼容 */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={tc.modalTitle}
        className={[
          'fixed z-50 left-1/2 top-1/2 -translate-x-1/2',
          'w-[min(480px,calc(100vw-2rem))]',
          'bg-bg-elevated border border-themed rounded-2xl shadow-2xl',
          'transition-all duration-[350ms] ease-[cubic-bezier(0.16,1,0.3,1)]',
          isOpen
            ? '-translate-y-1/2 opacity-100 scale-100'
            : '-translate-y-[48%] opacity-0 scale-95 pointer-events-none',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-themed-dim">
          <div className="flex items-center gap-2.5">
            <div className="size-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-surface border border-themed">
              <Sparkles className="size-3.5 text-accent" />
            </div>
            <h2 className="text-sm font-semibold text-foreground font-mono tracking-wide">
              {tc.modalTitle}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="size-7 rounded-lg flex items-center justify-center text-muted hover:text-foreground hover:bg-surface transition-colors"
            aria-label={tc.cancel}
          >
            <X className="size-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4">
          {/* Hint */}
          <p className="text-[11px] text-muted font-mono leading-relaxed">
            {tc.hint}
          </p>

          {/* Textarea */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, MAX_CHARS))}
              placeholder={tc.placeholder}
              rows={5}
              className={[
                'w-full resize-none rounded-xl px-4 py-3 text-sm font-mono',
                'bg-surface border transition-colors duration-150',
                'text-foreground placeholder:text-muted',
                'focus:outline-none focus:ring-2 focus:ring-accent/30',
                isOverLimit
                  ? 'border-danger/40 focus:border-danger/50'
                  : 'border-themed focus:border-accent/50',
              ].join(' ')}
              style={{ lineHeight: '1.6' }}
            />

            {/* Char counter */}
            <div
              className={[
                'absolute bottom-3 right-3 text-[10px] font-mono tabular-nums transition-colors',
                remaining <= 50 ? 'text-danger' : remaining <= 100 ? 'text-warning' : 'text-muted',
              ].join(' ')}
            >
              {remaining}{tc.charCount}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-3 pt-1">
            {draft.length > 0 ? (
              <button
                onClick={handleClear}
                className="text-[11px] font-mono text-muted hover:text-danger transition-colors"
              >
                {tc.clear}
              </button>
            ) : (
              <span />
            )}

            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-mono text-muted hover:text-foreground hover:bg-surface border border-themed transition-all duration-150"
              >
                {tc.cancel}
              </button>
              <button
                onClick={handleSave}
                disabled={isOverLimit}
                className={[
                  'px-4 py-2 rounded-xl text-xs font-mono font-semibold flex items-center gap-1.5 transition-all duration-150',
                  isOverLimit
                    ? 'opacity-40 cursor-not-allowed bg-accent/10 text-accent border border-accent/20'
                    : 'bg-accent/20 hover:bg-accent/30 text-accent border border-accent/30 hover:border-accent/50 active:scale-[0.97]',
                ].join(' ')}
              >
                <Check className="size-3" />
                {tc.save}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export function InvestmentConfig({
  intent,
  period,
  amount,
  customTendency = '',
  onIntentChange,
  onPeriodChange,
  onAmountChange,
  onCustomTendencyChange,
}: Props) {
  const { t } = useLocale()
  const [modalOpen, setModalOpen] = useState(false)
  const tc = t.investmentConfig.customTendency
  const hasTendency = customTendency.trim().length > 0

  return (
    <>
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

        {/* Custom Tendency */}
        <div>
          <h3 className="text-xs uppercase tracking-widest text-muted font-mono mb-3">
            {tc.title}
          </h3>
          <button
            onClick={() => setModalOpen(true)}
            className={[
              'w-full rounded-xl border px-3 py-2.5 text-left transition-all duration-150 group',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
              hasTendency
                ? 'border-accent/30 bg-accent/5 hover:border-accent/50 hover:bg-accent/10'
                : 'border-dashed border-themed bg-surface hover:border-accent/40 hover:bg-accent/5',
            ].join(' ')}
          >
            <div className={['flex gap-2.5', hasTendency ? 'items-start' : 'items-center'].join(' ')}>
              <div
                className={[
                  'size-5 rounded-md flex items-center justify-center flex-shrink-0 transition-colors',
                  hasTendency
                    ? 'bg-accent/20 text-accent'
                    : 'bg-surface border border-themed text-muted group-hover:text-accent/70 group-hover:border-accent/30',
                ].join(' ')}
              >
                <SlidersHorizontal className="size-3" />
              </div>
              <div className="flex-1 min-w-0">
                {hasTendency ? (
                  <>
                    <p className="text-[10px] text-accent/70 font-mono mb-0.5">{tc.buttonFilled}</p>
                    <p className="text-xs font-mono text-foreground leading-relaxed line-clamp-2">
                      {customTendency}
                    </p>
                  </>
                ) : (
                  <p className="text-xs font-mono leading-none text-muted group-hover:text-foreground transition-colors">
                    {tc.buttonEmpty}
                  </p>
                )}
              </div>
            </div>
          </button>
        </div>
      </div>

      <CustomTendencyModal
        isOpen={modalOpen}
        value={customTendency}
        onClose={() => setModalOpen(false)}
        onSave={onCustomTendencyChange}
      />
    </>
  )
}
