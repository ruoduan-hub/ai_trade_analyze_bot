'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Database, Copy, Check } from 'lucide-react'
import type { CCXTOrder } from '@/types'
import { Card } from './ui/Card'
import { useLocale } from '@/contexts/LocaleContext'

interface Props {
  orders: CCXTOrder[]
}

export function OrderDataViewer({ orders }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const { t } = useLocale()

  const json = JSON.stringify(orders, null, 2)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(json)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <Card className="overflow-hidden">
      {/* 折叠头部 */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center justify-between w-full text-left"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <Database className="size-4 text-accent flex-shrink-0" />
          <span className="text-xs uppercase tracking-widest text-muted font-mono">
            {t.orderDataViewer.title}
          </span>
          <span className="text-[10px] font-mono text-accent/70 bg-accent/10 px-1.5 py-0.5 rounded-md tabular-nums">
            {orders.length}
          </span>
        </div>
        <div className="flex items-center gap-2 text-muted">
          <span className="text-[10px] font-mono">
            {isOpen ? t.orderDataViewer.toggleClose : t.orderDataViewer.toggleOpen}
          </span>
          {isOpen
            ? <ChevronDown className="size-3.5 transition-transform duration-200" />
            : <ChevronRight className="size-3.5 transition-transform duration-200" />
          }
        </div>
      </button>

      {/* 展开内容 */}
      {isOpen && (
        <div className="mt-3 pt-3 border-t border-themed-dim">
          {/* 复制按钮 */}
          <div className="flex justify-end mb-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-[10px] font-mono text-muted hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-surface"
              aria-label={t.orderDataViewer.copyButton}
            >
              {copied
                ? <><Check className="size-3 text-success" /><span className="text-success">{t.orderDataViewer.copied}</span></>
                : <><Copy className="size-3" />{t.orderDataViewer.copyButton}</>
              }
            </button>
          </div>

          {/* JSON 展示 */}
          <pre className="text-[11px] font-mono leading-relaxed text-foreground/80 bg-bg-deep/60 rounded-xl p-3 overflow-x-auto whitespace-pre">
            {json}
          </pre>
        </div>
      )}
    </Card>
  )
}
