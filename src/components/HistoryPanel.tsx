'use client'

import { useState, useEffect } from 'react'
import { X, Trash2, ChevronRight, Clock, AlertTriangle, CheckCircle2, RotateCcw } from 'lucide-react'
import type { AnalysisRecord } from '@/types'
import { getAllAnalyses, clearAllAnalyses, deleteAnalysis } from '@/lib/indexdb'
import { Card } from './ui/Card'
import { Button } from './ui/Button'
import { Badge } from './ui/Badge'
import { MarkdownRenderer } from './ui/MarkdownRenderer'
import { useLocale } from '@/contexts/LocaleContext'

interface Props {
  isOpen: boolean
  onClose: () => void
  refreshTrigger: number
  onReuse: (record: AnalysisRecord) => void
}

export function HistoryPanel({ isOpen, onClose, refreshTrigger, onReuse }: Props) {
  const [records, setRecords] = useState<AnalysisRecord[]>([])
  const [selected, setSelected] = useState<AnalysisRecord | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { t, locale } = useLocale()

  useEffect(() => {
    if (!isOpen) return
    setIsLoading(true)
    getAllAnalyses()
      .then(setRecords)
      .finally(() => setIsLoading(false))
  }, [isOpen, refreshTrigger])

  useEffect(() => {
    if (!isOpen) setSelected(null)
  }, [isOpen])

  async function handleClearAll() {
    await clearAllAnalyses()
    setRecords([])
    setSelected(null)
    setConfirmClear(false)
  }

  async function handleDeleteOne(id: string) {
    await deleteAnalysis(id)
    setRecords((prev) => prev.filter((r) => r.id !== id))
    if (selected?.id === id) setSelected(null)
    setConfirmDeleteId(null)
  }

  function handleReuse(record: AnalysisRecord) {
    onReuse(record)
    onClose()
  }

  const intentLabels = {
    aggressive: t.investmentConfig.intents.aggressive.label,
    steady: t.investmentConfig.intents.steady.label,
    conservative: t.investmentConfig.intents.conservative.label,
  }
  const periodLabels = {
    short: t.investmentConfig.periods.short.label,
    mid: t.investmentConfig.periods.mid.label,
    long: t.investmentConfig.periods.long.label,
  }

  const INTENT_VARIANTS: Record<string, 'danger' | 'warning' | 'success'> = {
    aggressive: 'danger',
    steady: 'warning',
    conservative: 'success',
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={[
          'fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Left drawer */}
      <div
        className={[
          'fixed top-0 left-0 z-50 h-full flex transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
        role="dialog"
        aria-modal="true"
        aria-label={t.historyPanel.dialogAriaLabel}
      >
        {/* List panel */}
        <div className="w-72 h-full bg-bg-base border-r border-themed-dim flex flex-col shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-themed-dim flex-shrink-0">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-accent" />
              <h2 className="text-sm font-heading font-bold text-foreground">{t.historyPanel.title}</h2>
              <Badge variant="info">{records.length}</Badge>
            </div>
            <button
              onClick={onClose}
              className="size-8 rounded-xl flex items-center justify-center hover:bg-surface text-muted hover:text-foreground transition-colors"
              aria-label={t.historyPanel.closeAriaLabel}
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Clear all action */}
          {records.length > 0 && (
            <div className="px-4 py-2 border-b border-themed-dim flex-shrink-0">
              {!confirmClear ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmClear(true)}
                  className="text-muted hover:text-danger w-full justify-start"
                >
                  <Trash2 className="size-3.5" />
                  {t.historyPanel.clearAll}
                </Button>
              ) : (
                <div className="flex items-center gap-2 glass rounded-xl px-3 py-2 border border-danger/20">
                  <AlertTriangle className="size-3.5 text-danger flex-shrink-0" />
                  <span className="text-[10px] text-danger font-mono flex-1">
                    {t.historyPanel.confirmClearMsg}
                  </span>
                  <button
                    onClick={handleClearAll}
                    className="text-[10px] font-mono text-danger underline hover:no-underline"
                  >
                    {t.historyPanel.confirm}
                  </button>
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="text-[10px] font-mono text-muted hover:text-foreground"
                  >
                    {t.historyPanel.cancel}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* List */}
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="size-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!isLoading && records.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                <Clock className="size-10 text-muted/20" />
                <p className="text-xs text-muted font-mono">{t.historyPanel.empty}</p>
              </div>
            )}

            {records.map((record) => (
              <div key={record.id} className="relative group">
                <button
                  onClick={() => setSelected(selected?.id === record.id ? null : record)}
                  className={[
                    'text-left p-3 rounded-xl border transition-all duration-150 hover:bg-surface w-full pr-8',
                    selected?.id === record.id
                      ? 'border-accent/30 bg-accent/5'
                      : 'border-themed-dim',
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-1 flex-wrap">
                        {record.symbols.map((sym) => (
                          <span key={sym} className="text-[10px] font-mono text-foreground bg-surface px-1.5 py-0.5 rounded">
                            {sym.replace('/USDT', '')}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap mt-1">
                        <Badge variant={INTENT_VARIANTS[record.intent] ?? 'neutral'}>
                          {intentLabels[record.intent]}
                        </Badge>
                        <Badge variant="info">{periodLabels[record.period]}</Badge>
                        {record.executed && (
                          <Badge variant="success">
                            <CheckCircle2 className="size-2.5" />{t.historyPanel.executed}
                          </Badge>
                        )}
                      </div>
                      <span className="text-[10px] text-muted font-mono truncate">
                        ${record.amount.toLocaleString()} · {new Date(record.timestamp).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US')}
                      </span>
                    </div>
                    <ChevronRight
                      className={`size-4 text-muted flex-shrink-0 mt-0.5 transition-transform ${selected?.id === record.id ? 'rotate-90' : ''}`}
                    />
                  </div>
                </button>

                {/* Single delete button */}
                {confirmDeleteId === record.id ? (
                  <div className="absolute inset-0 rounded-xl bg-bg-elevated border border-danger/30 flex items-center justify-center gap-3 px-3">
                    <span className="text-[10px] font-mono text-danger flex-1">
                      {t.historyPanel.deleteConfirmMsg}
                    </span>
                    <button
                      onClick={() => handleDeleteOne(record.id)}
                      className="text-[10px] font-mono text-danger underline hover:no-underline"
                    >
                      {t.historyPanel.confirm}
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="text-[10px] font-mono text-muted hover:text-foreground"
                    >
                      {t.historyPanel.cancel}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(record.id) }}
                    className="absolute top-2 right-2 size-6 rounded-lg flex items-center justify-center text-muted hover:text-danger hover:bg-danger/10 transition-colors opacity-0 group-hover:opacity-100"
                    aria-label={t.historyPanel.deleteAriaLabel}
                  >
                    <Trash2 className="size-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Detail panel */}
        <div
          className={[
            'h-full bg-bg-elevated border-r border-themed-dim flex flex-col shadow-2xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden',
            selected ? 'w-[480px] opacity-100' : 'w-0 opacity-0',
          ].join(' ')}
        >
          {selected && (
            <>
              <div className="flex items-center justify-between px-4 py-4 border-b border-themed-dim flex-shrink-0 gap-3">
                <h3 className="text-xs font-mono font-semibold text-foreground truncate">
                  {new Date(selected.timestamp).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US')}
                </h3>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleReuse(selected)}
                  >
                    <RotateCcw className="size-3" />
                    {t.historyPanel.reuseButton}
                  </Button>
                  <button
                    onClick={() => setSelected(null)}
                    className="size-8 rounded-xl flex items-center justify-center hover:bg-surface text-muted hover:text-foreground transition-colors"
                    aria-label={t.historyPanel.closeDetailAriaLabel}
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <MarkdownRenderer content={selected.report} variant="compact" />
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
