'use client'

import { PanelLeftClose, PanelLeftOpen, Zap } from 'lucide-react'
import { CryptoSelector } from '@/components/CryptoSelector'
import { InvestmentConfig } from '@/components/InvestmentConfig'
import { Button } from '@/components/ui/Button'
import { useLocale } from '@/contexts/LocaleContext'
import type { InvestmentIntent, InvestmentPeriod, TickerData } from '@/types'
import type { MarketOption } from '@/app/api/markets/route'

interface AppSidebarProps {
  /** 侧栏是否折叠 */
  collapsed: boolean
  onToggleCollapse: () => void

  /** CryptoSelector 状态（selectedSymbols 实为 market id 数组） */
  selectedSymbols: string[]
  onSymbolsChange: (ids: string[]) => void
  onMarketsLoaded?: (markets: MarketOption[]) => void
  tickers: Record<string, TickerData>

  /** InvestmentConfig 状态 */
  intent: InvestmentIntent
  period: InvestmentPeriod
  amount: number
  customTendency?: string
  onIntentChange: (v: InvestmentIntent) => void
  onPeriodChange: (v: InvestmentPeriod) => void
  onAmountChange: (v: number) => void
  onCustomTendencyChange: (v: string) => void

  /** 分析按钮状态 */
  isAnalyzing: boolean
  isFetchingMarket: boolean
  canAnalyze: boolean
  hasApiKey: boolean

  onAnalyze: () => void
  onOpenSettings: () => void
}

/**
 * 左侧配置侧栏（仅桌面端显示）
 * - 支持折叠/展开，折叠后宽度收缩为图标栏
 * - 包含币种选择、投资参数配置、开始分析按钮
 */
export function AppSidebar({
  collapsed,
  onToggleCollapse,
  selectedSymbols,
  onSymbolsChange,
  onMarketsLoaded,
  tickers,
  intent,
  period,
  amount,
  customTendency,
  onIntentChange,
  onPeriodChange,
  onAmountChange,
  onCustomTendencyChange,
  isAnalyzing,
  isFetchingMarket,
  canAnalyze,
  hasApiKey,
  onAnalyze,
  onOpenSettings,
}: AppSidebarProps) {
  const { t } = useLocale()

  return (
    <aside
      className={[
        'hidden lg:flex flex-shrink-0 flex-col border-r border-themed-dim overflow-hidden',
        'transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
        collapsed ? 'w-12' : 'w-80',
      ].join(' ')}
    >
      {/* 折叠切换按钮 */}
      <div className="flex items-center justify-end px-2 py-2 border-b border-themed-dim flex-shrink-0">
        <button
          onClick={onToggleCollapse}
          className="size-8 rounded-xl flex items-center justify-center text-muted hover:text-foreground hover:bg-surface transition-colors"
          aria-label={collapsed ? t.sidebar.expandAriaLabel : t.sidebar.collapseAriaLabel}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4" />
          ) : (
            <PanelLeftClose className="size-4" />
          )}
        </button>
      </div>

      {/* 内容区（折叠时隐藏） */}
      <div
        className={[
          'overflow-y-auto transition-opacity duration-200',
          collapsed ? 'opacity-0 pointer-events-none' : 'opacity-100',
        ].join(' ')}
      >
        <div className="p-4 flex flex-col gap-5">
          <CryptoSelector
            selected={selectedSymbols}
            onChange={onSymbolsChange}
            tickers={tickers}
            onMarketsLoaded={onMarketsLoaded}
          />

          <div className="h-px bg-border-dim" />

          <InvestmentConfig
            intent={intent}
            period={period}
            amount={amount}
            customTendency={customTendency}
            onIntentChange={onIntentChange}
            onPeriodChange={onPeriodChange}
            onAmountChange={onAmountChange}
            onCustomTendencyChange={onCustomTendencyChange}
          />

          <Button
            variant="primary"
            size="lg"
            className="w-full"
            disabled={!canAnalyze}
            loading={isAnalyzing}
            onClick={onAnalyze}
          >
            {!isAnalyzing && <Zap className="size-4" />}
            {isAnalyzing
              ? isFetchingMarket
                ? t.sidebar.fetchingMarket
                : t.sidebar.analyzing
              : t.sidebar.startAnalysis}
          </Button>

          {/* 未配置 API Key 时的提示 */}
          {!hasApiKey && (
            <button
              onClick={onOpenSettings}
              className="text-[10px] text-warning/70 font-mono text-center hover:text-warning transition-colors"
            >
              {t.sidebar.apiKeyWarning}
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}
