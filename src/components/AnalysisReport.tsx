'use client'

import { useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { Sparkles, Loader2 } from 'lucide-react'
import { Card } from './ui/Card'

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
          <p className="text-sm font-mono text-foreground">AI 分析报告</p>
          <p className="text-xs text-muted font-mono mt-1">选择币种并配置投资参数后点击"开始分析"</p>
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
            <p className="text-sm font-mono font-semibold text-danger">分析失败</p>
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
          <span className="text-xs uppercase tracking-widest text-muted font-mono">AI 分析报告</span>
        </div>
        {isStreaming && (
          <div className="flex items-center gap-1.5 text-xs text-accent font-mono">
            <Loader2 className="size-3 animate-spin" />
            分析中...
          </div>
        )}
      </div>

      {isStreaming && !report ? (
        <SkeletonPulse />
      ) : (
        <div className="prose-crypto">
          <ReactMarkdown
            components={{
              h1: ({ children }) => (
                <h1 className="text-base font-heading font-bold text-foreground mt-4 mb-2 first:mt-0">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-sm font-heading font-bold text-foreground/90 mt-4 mb-2 pb-1 border-b border-themed-dim">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-xs font-mono font-semibold text-accent mt-3 mb-1.5 uppercase tracking-wide">
                  {children}
                </h3>
              ),
              p: ({ children }) => (
                <p className="text-xs font-mono text-foreground/80 leading-relaxed mb-2">
                  {children}
                </p>
              ),
              ul: ({ children }) => (
                <ul className="list-none space-y-1 mb-3">{children}</ul>
              ),
              li: ({ children }) => (
                <li className="flex items-start gap-2 text-xs font-mono text-foreground/80 leading-relaxed">
                  <span className="text-accent mt-0.5 flex-shrink-0">›</span>
                  <span>{children}</span>
                </li>
              ),
              strong: ({ children }) => (
                <strong className="text-foreground font-semibold">{children}</strong>
              ),
              code: ({ children, className }) => {
                if (className?.includes('language-json')) {
                  return (
                    <code className="block text-[10px] font-mono text-success/80 bg-success/5 border border-success/10 rounded-lg p-3 whitespace-pre-wrap overflow-x-auto">
                      {children}
                    </code>
                  )
                }
                return (
                  <code className="text-[10px] font-mono text-accent bg-accent/10 rounded px-1 py-0.5">
                    {children}
                  </code>
                )
              },
              pre: ({ children }) => (
                <pre className="my-3 overflow-hidden rounded-lg">{children}</pre>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-2 border-accent/40 pl-3 italic text-xs text-muted font-mono my-2">
                  {children}
                </blockquote>
              ),
              hr: () => <hr className="border-themed-dim my-4" />,
            }}
          >
            {report}
          </ReactMarkdown>

          {isStreaming && (
            <span className="inline-block size-2 bg-accent rounded-full animate-pulse ml-0.5" />
          )}
        </div>
      )}

      <div ref={bottomRef} />
    </Card>
  )
}
