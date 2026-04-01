'use client'

import { useEffect, useRef } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { Card } from './ui/Card'
import { MarkdownRenderer } from './ui/MarkdownRenderer'
import { useLocale } from '@/contexts/LocaleContext'

interface Props {
  report: string
  isStreaming: boolean
  error: string | null
}

function SkeletonPulse() {
  return (
    <div className="flex flex-col gap-3 animate-pulse">
      <div className="h-4 bg-surface rounded-lg w-3/4" />
      <div className="h-4 bg-surface rounded-lg w-full" />
      <div className="h-4 bg-surface rounded-lg w-5/6" />
      <div className="h-4 bg-surface rounded-lg w-2/3" />
      <div className="h-3 bg-surface/60 rounded-lg w-full mt-2" />
      <div className="h-3 bg-surface/60 rounded-lg w-4/5" />
      <div className="h-3 bg-surface/60 rounded-lg w-full" />
    </div>
  )
}

export function AnalysisReport({ report, isStreaming, error }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const { t } = useLocale()

  useEffect(() => {
    if (isStreaming && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [report, isStreaming])

  if (!report && !isStreaming && !error) {
    return (
      <Card className="flex flex-col items-center justify-center min-h-64 text-center gap-4">
        <div className="size-12 rounded-full bg-accent/10 flex items-center justify-center">
          <Sparkles className="size-6 text-accent" />
        </div>
        <div>
          <p className="text-sm font-mono text-foreground">{t.analysisReport.emptyTitle}</p>
          <p className="text-xs text-muted font-mono mt-1">{t.analysisReport.emptySubtitle}</p>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border border-danger/20 bg-danger/5">
        <div className="flex items-start gap-3">
          <div className="size-8 rounded-full bg-danger/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-danger text-sm">!</span>
          </div>
          <div>
            <p className="text-sm font-mono font-semibold text-danger">{t.analysisReport.errorTitle}</p>
            <p className="text-xs font-mono text-muted mt-1 leading-relaxed">{error}</p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="relative">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-themed-dim">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-accent" />
          <span className="text-xs uppercase tracking-widest text-muted font-mono">
            {t.analysisReport.title}
          </span>
        </div>
        {isStreaming && (
          <div className="flex items-center gap-1.5 text-xs text-accent font-mono">
            <Loader2 className="size-3 animate-spin" />
            {t.analysisReport.streaming}
          </div>
        )}
      </div>

      {isStreaming && !report ? (
        <SkeletonPulse />
      ) : (
        <div className="prose-crypto">
          <MarkdownRenderer content={report} variant="full" />
          {isStreaming && (
            <span className="inline-block size-2 bg-accent rounded-full animate-pulse ml-0.5" />
          )}
        </div>
      )}

      <div ref={bottomRef} />
    </Card>
  )
}
