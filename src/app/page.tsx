'use client'

import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react'
import { Zap } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { useSession } from '@/hooks/useSession'
import { useLocale } from '@/contexts/LocaleContext'

import { AppHeader } from '@/components/AppHeader'
import { AppSidebar } from '@/components/AppSidebar'
import { MobileTabBar, type MobileTab } from '@/components/MobileTabBar'
import { CryptoSelector } from '@/components/CryptoSelector'
import { InvestmentConfig } from '@/components/InvestmentConfig'
import { MarketDataPanel } from '@/components/MarketDataPanel'
import { AnalysisReport } from '@/components/AnalysisReport'
import { OrderPreview } from '@/components/OrderPreview'
import { Button } from '@/components/ui/Button'

import { fetchAllMarketData } from '@/lib/marketApi'
import { analyzeWithStreaming, parseOrdersFromReport } from '@/lib/claude'
import { saveAnalysis } from '@/lib/indexdb'

import type {
  InvestmentIntent,
  InvestmentPeriod,
  MarketSnapshot,
  CCXTOrder,
  AnalysisRecord,
} from '@/types'
import type { OrderResult } from '@/lib/ccxt-client'

// 懒加载非首屏的重型组件，减少初始 bundle 体积
const SettingsModal = lazy(() =>
  import('@/components/SettingsModal').then((m) => ({ default: m.SettingsModal })),
)
const HistoryPanel = lazy(() =>
  import('@/components/HistoryPanel').then((m) => ({ default: m.HistoryPanel })),
)

export default function Home() {
  return <HomeContent />
}

function HomeContent() {
  // ── 投资配置状态 ────────────────────────────────────────────
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(['BTC/USDT'])
  const [intent, setIntent] = useState<InvestmentIntent>('steady')
  const [period, setPeriod] = useState<InvestmentPeriod>('mid')
  const [amount, setAmount] = useState<number>(1000)

  // ── AI Provider & API Key（sessionStorage 持久化） ──────────
  const { provider, apiKey, saveSession } = useSession()

  // ── 行情数据 ────────────────────────────────────────────────
  const [snapshot, setSnapshot] = useState<MarketSnapshot | null>(null)
  const [isFetchingMarket, setIsFetchingMarket] = useState(false)
  const [marketError, setMarketError] = useState<string | null>(null)

  // 选币器轻量价格（仅用于显示，不触发完整行情拉取）
  const [selectorTickers, setSelectorTickers] = useState<MarketSnapshot['tickers']>({})

  useEffect(() => {
    fetchAllMarketData(['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'XRP/USDT'])
      .then((s) => setSelectorTickers(s.tickers))
      .catch(() => {})
  }, [])

  // ── 分析结果状态 ────────────────────────────────────────────
  const [report, setReport] = useState('')
  const [orders, setOrders] = useState<CCXTOrder[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  // 用于关联当前分析记录，执行下单后更新 IndexedDB
  const currentRecordId = useRef<string | null>(null)

  // ── 主题 ────────────────────────────────────────────────────
  const { theme, toggleTheme, mounted } = useTheme()
  const { locale } = useLocale()

  // ── UI 状态 ─────────────────────────────────────────────────
  const [showSettings, setShowSettings] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [historyRefresh, setHistoryRefresh] = useState(0)
  // 每次新分析自增，用于重置 OrderPreview 组件内部状态
  const [analysisKey, setAnalysisKey] = useState(0)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileTab, setMobileTab] = useState<MobileTab>('config')

  // ── 主分析流程 ──────────────────────────────────────────────
  const handleAnalyze = useCallback(async () => {
    if (selectedSymbols.length === 0) return
    if (!apiKey) {
      setShowSettings(true)
      return
    }

    setReport('')
    setOrders([])
    setAnalysisError(null)
    setAnalysisKey((k) => k + 1)
    setIsFetchingMarket(true)
    setMarketError(null)

    let snap: MarketSnapshot
    try {
      snap = await fetchAllMarketData(selectedSymbols)
      setSnapshot(snap)
      setSelectorTickers((prev) => ({ ...prev, ...snap.tickers }))
    } catch (err) {
      setMarketError(err instanceof Error ? err.message : '获取市场数据失败')
      setIsFetchingMarket(false)
      return
    }
    setIsFetchingMarket(false)
    setIsStreaming(true)

    const recordId = crypto.randomUUID()
    currentRecordId.current = recordId

    await analyzeWithStreaming(
      provider,
      apiKey,
      { symbols: selectedSymbols, intent, period, amount, locale },
      snap,
      (chunk) => setReport((prev) => prev + chunk),
      async (complete) => {
        setIsStreaming(false)
        const parsedOrders = parseOrdersFromReport(complete)
        setOrders(parsedOrders)
        await saveAnalysis({
          id: recordId,
          timestamp: Date.now(),
          symbols: selectedSymbols,
          intent,
          period,
          amount,
          marketSnapshot: snap,
          report: complete,
          orders: parsedOrders,
          executed: false,
        })
        setHistoryRefresh((n) => n + 1)
      },
      (err) => {
        setIsStreaming(false)
        setAnalysisError(err.message)
      },
    )
  }, [selectedSymbols, intent, period, amount, apiKey, provider])

  /** 下单执行后更新 IndexedDB 中的 executed 状态 */
  function handleOrdersExecuted(_results: OrderResult[]) {
    if (currentRecordId.current) {
      import('@/lib/indexdb').then(({ updateAnalysis }) =>
        updateAnalysis(currentRecordId.current!, { executed: true, executedAt: Date.now() }),
      )
      setHistoryRefresh((n) => n + 1)
    }
  }

  /** 从历史记录恢复所有状态，自增 analysisKey 重置订单面板 */
  function handleReuseRecord(record: AnalysisRecord) {
    setSelectedSymbols(record.symbols)
    setIntent(record.intent)
    setPeriod(record.period)
    setAmount(record.amount)
    setReport(record.report)
    setOrders(record.orders)
    setAnalysisError(null)
    setAnalysisKey((k) => k + 1)
    currentRecordId.current = record.id
  }

  const isAnalyzing = isFetchingMarket || isStreaming
  const canAnalyze = selectedSymbols.length > 0 && !isAnalyzing

  return (
    <div className="flex flex-col h-dvh bg-bg-deep overflow-hidden">
      {/* 环境光背景（纯装饰，不影响交互） */}
      <AmbientBackground />

      {/* 顶部导航栏 */}
      <AppHeader
        theme={theme}
        mounted={mounted}
        isFetchingMarket={isFetchingMarket}
        isStreaming={isStreaming}
        marketError={marketError}
        hasApiKey={Boolean(apiKey)}
        onToggleTheme={toggleTheme}
        onOpenHistory={() => setShowHistory(true)}
        onOpenSettings={() => setShowSettings(true)}
      />

      {/* 主布局：桌面三栏 / 移动单栏+底部 Tab */}
      <div className="relative z-10 flex flex-1 overflow-hidden">

        {/* 左侧配置侧栏（桌面端） */}
        <AppSidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
          selectedSymbols={selectedSymbols}
          onSymbolsChange={setSelectedSymbols}
          tickers={selectorTickers}
          intent={intent}
          period={period}
          amount={amount}
          onIntentChange={setIntent}
          onPeriodChange={setPeriod}
          onAmountChange={setAmount}
          isAnalyzing={isAnalyzing}
          isFetchingMarket={isFetchingMarket}
          canAnalyze={canAnalyze}
          hasApiKey={Boolean(apiKey)}
          onAnalyze={handleAnalyze}
          onOpenSettings={() => setShowSettings(true)}
        />

        {/* 中间：行情面板 + 分析报告（桌面端） */}
        <main className="hidden lg:flex flex-1 overflow-y-auto p-4 flex-col gap-4 min-w-0">
          {snapshot && (
            <div className="animate-fade-in">
              <MarketDataPanel snapshot={snapshot} selectedSymbols={selectedSymbols} />
            </div>
          )}
          <AnalysisReport report={report} isStreaming={isStreaming} error={analysisError} />
        </main>

        {/* 右侧订单面板（桌面端） */}
        <aside className="hidden lg:block w-80 flex-shrink-0 border-l border-themed-dim overflow-y-auto p-4">
          <OrderPreview key={analysisKey} orders={orders} onOrdersExecuted={handleOrdersExecuted} />
        </aside>

        {/* 移动端 Tab 内容区 */}
        <div className="lg:hidden flex-1 overflow-y-auto">
          {mobileTab === 'config' && (
            <div className="p-4 flex flex-col gap-5">
              <CryptoSelector
                selected={selectedSymbols}
                onChange={setSelectedSymbols}
                tickers={selectorTickers}
              />
              <div className="h-px bg-white/[0.06]" />
              <InvestmentConfig
                intent={intent}
                period={period}
                amount={amount}
                onIntentChange={setIntent}
                onPeriodChange={setPeriod}
                onAmountChange={setAmount}
              />
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                disabled={!canAnalyze}
                loading={isAnalyzing}
                onClick={() => { handleAnalyze(); setMobileTab('report') }}
              >
                {!isAnalyzing && <Zap className="size-4" />}
                {isAnalyzing ? (isFetchingMarket ? '获取行情...' : 'AI 分析中...') : '开始分析'}
              </Button>
              {!apiKey && (
                <button
                  onClick={() => setShowSettings(true)}
                  className="text-[10px] text-warning/70 font-mono text-center hover:text-warning transition-colors"
                >
                  ⚠ 请先设置 API Key
                </button>
              )}
            </div>
          )}

          {mobileTab === 'report' && (
            <div className="p-4 flex flex-col gap-4">
              {snapshot && (
                <div className="animate-fade-in">
                  <MarketDataPanel snapshot={snapshot} selectedSymbols={selectedSymbols} />
                </div>
              )}
              <AnalysisReport report={report} isStreaming={isStreaming} error={analysisError} />
            </div>
          )}

          {mobileTab === 'order' && (
            <div className="p-4">
              <OrderPreview key={analysisKey} orders={orders} onOrdersExecuted={handleOrdersExecuted} />
            </div>
          )}
        </div>
      </div>

      {/* 移动端底部 Tab 导航 */}
      <MobileTabBar
        activeTab={mobileTab}
        isAnalyzing={isAnalyzing}
        onChange={setMobileTab}
      />

      {/* 懒加载弹层：仅在首次打开时加载 JS */}
      <Suspense fallback={null}>
        {showSettings && (
          <SettingsModal
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
            provider={provider}
            apiKey={apiKey}
            onSave={saveSession}
          />
        )}
        {showHistory && (
          <HistoryPanel
            onReuse={handleReuseRecord}
            isOpen={showHistory}
            onClose={() => setShowHistory(false)}
            refreshTrigger={historyRefresh}
          />
        )}
      </Suspense>
    </div>
  )
}

/**
 * 环境光背景装饰层
 * 三个径向渐变光晕，纯视觉效果，pointer-events-none
 */
function AmbientBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      <div
        className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-[0.06]"
        style={{ background: 'radial-gradient(circle, #5e6ad2 0%, transparent 70%)' }}
      />
      <div
        className="absolute top-1/2 -right-32 w-80 h-80 rounded-full opacity-[0.04] hidden lg:block"
        style={{ background: 'radial-gradient(circle, #22c55e 0%, transparent 70%)' }}
      />
      <div
        className="absolute -bottom-20 left-1/3 w-72 h-72 rounded-full opacity-[0.03]"
        style={{ background: 'radial-gradient(circle, #f59e0b 0%, transparent 70%)' }}
      />
    </div>
  )
}
