'use client'

import { useState, useEffect } from 'react'
import { X, Trash2, ChevronRight, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import type { AnalysisRecord } from '@/types'
import { getAllAnalyses, clearAllAnalyses } from '@/lib/indexdb'
import { Card } from './ui/Card'
import { Button } from './ui/Button'
import { Badge } from './ui/Badge'

const INTENT_LABELS: Record<string, string> = {
  aggressive: '进取',
  steady: '稳健',
  conservative: '保守',
}
const PERIOD_LABELS: Record<string, string> = {
  short: '短期',
  mid: '中期',
  long: '长期',
}
const INTENT_VARIANTS: Record<string, 'danger' | 'warning' | 'success'> = {
  aggressive: 'danger',
  steady: 'warning',
  conservative: 'success',
}

interface Props {
  isOpen: boolean
  onClose: () => void
  refreshTrigger: number
}

export function HistoryPanel({ isOpen, onClose, refreshTrigger }: Props) {
  const [records, setRecords] = useState<AnalysisRecord[]>([])
  const [selected, setSelected] = useState<AnalysisRecord | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setIsLoading(true)
    getAllAnalyses()
      .then(setRecords)
      .finally(() => setIsLoading(false))
  }, [isOpen, refreshTrigger])

  async function handleClearAll() {
    await clearAllAnalyses()
    setRecords([])
    setSelected(null)
    setConfirmClear(false)
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="分析历史"
    >
      {/* 蒙层 - 不设置 z-index，利用 DOM 顺序 */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 弹窗 - 后渲染，自然覆盖在蒙层之上 */}
      <div className="relative w-full max-w-4xl bg-bg-base border border-themed-dim rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl animate-slide-up">
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-surface" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pb-4 border-b border-themed-dim">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-accent" />
            <h2 className="text-sm font-heading font-bold text-foreground">分析历史</h2>
            <Badge variant="info">{records.length}</Badge>
          </div>
          <div className="flex items-center gap-2">
            {records.length > 0 && !confirmClear && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmClear(true)}
                className="text-muted hover:text-danger"
              >
                <Trash2 className="size-3.5" />
                清除全部
              </Button>
            )}
            {confirmClear && (
              <div className="flex items-center gap-2 glass rounded-xl px-3 py-1.5 border border-danger/20">
                <AlertTriangle className="size-3.5 text-danger" />
                <span className="text-[10px] text-danger font-mono">确认清除所有记录?</span>
                <button
                  onClick={handleClearAll}
                  className="text-[10px] font-mono text-danger underline hover:no-underline"
                >
                  确认
                </button>
                <button
                  onClick={() => setConfirmClear(false)}
                  className="text-[10px] font-mono text-muted hover:text-foreground"
                >
                  取消
                </button>
              </div>
            )}
            <button
              onClick={onClose}
              className="size-8 rounded-xl flex items-center justify-center hover:bg-surface text-muted hover:text-foreground transition-colors"
              aria-label="关闭"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* List */}
          <div className={`flex flex-col gap-2 p-4 overflow-y-auto ${selected ? 'w-80 flex-shrink-0 border-r border-themed-dim' : 'flex-1'}`}>
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="size-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!isLoading && records.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                <Clock className="size-10 text-muted/20" />
                <p className="text-xs text-muted font-mono">暂无历史记录</p>
              </div>
            )}

            {records.map((record) => (
              <button
                key={record.id}
                onClick={() => setSelected(selected?.id === record.id ? null : record)}
                className={[
                  'text-left p-3 rounded-xl border transition-all duration-150 hover:bg-surface',
                  selected?.id === record.id
                    ? 'border-accent/30 bg-accent/5'
                    : 'border-themed-dim',
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {record.symbols.map((sym) => (
                        <span key={sym} className="text-[10px] font-mono text-foreground bg-surface px-1.5 py-0.5 rounded">
                          {sym.replace('/USDT', '')}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={INTENT_VARIANTS[record.intent] ?? 'neutral'}>
                        {INTENT_LABELS[record.intent]}
                      </Badge>
                      <Badge variant="info">{PERIOD_LABELS[record.period]}</Badge>
                      {record.executed && (
                        <Badge variant="success">
                          <CheckCircle2 className="size-2.5" />已执行
                        </Badge>
                      )}
                    </div>
                    <span className="text-[10px] text-muted font-mono">
                      ${record.amount.toLocaleString()} USDT ·{' '}
                      {new Date(record.timestamp).toLocaleString('zh-CN')}
                    </span>
                  </div>
                  <ChevronRight
                    className={`size-4 text-muted flex-shrink-0 mt-0.5 transition-transform ${selected?.id === record.id ? 'rotate-90' : ''}`}
                  />
                </div>
              </button>
            ))}
          </div>

          {/* Detail */}
          {selected && (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-mono font-semibold text-foreground">
                  {new Date(selected.timestamp).toLocaleString('zh-CN')}
                </h3>
                <button
                  onClick={() => setSelected(null)}
                  className="text-muted hover:text-foreground text-xs font-mono"
                >
                  关闭详情
                </button>
              </div>

              <ReactMarkdown
                components={{
                  h2: ({ children }) => (
                    <h2 className="text-sm font-heading font-bold text-foreground mt-4 mb-2">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-xs font-mono font-semibold text-accent mt-3 mb-1 uppercase">{children}</h3>
                  ),
                  p: ({ children }) => (
                    <p className="text-xs font-mono text-foreground/80 leading-relaxed mb-2">{children}</p>
                  ),
                  li: ({ children }) => (
                    <li className="flex items-start gap-2 text-xs font-mono text-foreground/70 mb-1">
                      <span className="text-accent">›</span>
                      <span>{children}</span>
                    </li>
                  ),
                  code: ({ children, className }) => {
                    if (className?.includes('language-json')) {
                      return (
                        <code className="block text-[10px] font-mono text-success/80 bg-success/5 border border-success/10 rounded-lg p-3 whitespace-pre-wrap">
                          {children}
                        </code>
                      )
                    }
                    return (
                      <code className="text-[10px] font-mono text-accent bg-accent/10 rounded px-1">{children}</code>
                    )
                  },
                  pre: ({ children }) => <pre className="my-3 overflow-hidden rounded-lg">{children}</pre>,
                }}
              >
                {selected.report}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
