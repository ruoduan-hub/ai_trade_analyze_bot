'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Settings, Clock, Zap, RefreshCw, AlertCircle, Sun, Moon } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'

import { CryptoSelector } from '@/components/CryptoSelector'
import { InvestmentConfig } from '@/components/InvestmentConfig'
import { MarketDataPanel } from '@/components/MarketDataPanel'
import { AnalysisReport } from '@/components/AnalysisReport'
import { OrderPreview } from '@/components/OrderPreview'
import { HistoryPanel } from '@/components/HistoryPanel'
import { SettingsModal } from '@/components/SettingsModal'
import { Button } from '@/components/ui/Button'

import { fetchAllMarketData } from '@/lib/marketApi'
import { analyzeWithStreaming, parseOrdersFromReport } from '@/lib/claude'
import { saveAnalysis } from '@/lib/indexdb'

import type {
  AIProvider,
  InvestmentIntent,
  InvestmentPeriod,
  MarketSnapshot,
  CCXTOrder,
} from '@/types'
import type { OrderResult } from '@/lib/ccxt-client'

const SESSION_PROVIDER_KEY = 'ai_provider'
const SESSION_APIKEY_KEY = 'ai_api_key'

function loadSession(): { provider: AIProvider; apiKey: string } {
  if (typeof window === 'undefined') return { provider: 'openai', apiKey: '' }
  return {
    provider: (sessionStorage.getItem(SESSION_PROVIDER_KEY) as AIProvider) ?? 'openai',
    apiKey: sessionStorage.getItem(SESSION_APIKEY_KEY) ?? '',
  }
}
function saveSession(provider: AIProvider, key: string) {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(SESSION_PROVIDER_KEY, provider)
  if (key) sessionStorage.setItem(SESSION_APIKEY_KEY, key)
  else sessionStorage.removeItem(SESSION_APIKEY_KEY)
}

export default function Home() {
  // ── Config ─────────────────────────────────────────────────
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(['BTC/USDT', 'ETH/USDT'])
  const [intent, setIntent] = useState<InvestmentIntent>('steady')
  const [period, setPeriod] = useState<InvestmentPeriod>('mid')
  const [amount, setAmount] = useState<number>(1000)

  // ── API Key & Provider ─────────────────────────────────────
  const [provider, setProvider] = useState<AIProvider>('openai')
  const [anthropicKey, setAnthropicKey] = useState('')
  useEffect(() => {
    const s = loadSession()
    setProvider(s.provider)
    setAnthropicKey(s.apiKey)
  }, [])

  function handleSaveKey(p: AIProvider, key: string) {
    setProvider(p)
    setAnthropicKey(key)
    saveSession(p, key)
  }

  // ── Market Data ────────────────────────────────────────────
  const [snapshot, setSnapshot] = useState<MarketSnapshot | null>(null)
  const [isFetchingMarket, setIsFetchingMarket] = useState(false)
  const [marketError, setMarketError] = useState<string | null>(null)

  // Quick price refresh for CryptoSelector (lightweight)
  const [selectorTickers, setSelectorTickers] = useState<MarketSnapshot['tickers']>({})

  useEffect(() => {
    // Fetch initial prices for the selector on mount
    fetchAllMarketData(['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'XRP/USDT'])
      .then((s) => setSelectorTickers(s.tickers))
      .catch(() => {})
  }, [])

  // ── Analysis State ─────────────────────────────────────────
  const [report, setReport] = useState('')
  const [orders, setOrders] = useState<CCXTOrder[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const currentRecordId = useRef<string | null>(null)

  // ── Theme ──────────────────────────────────────────────────
  const { theme, toggleTheme, mounted } = useTheme()

  // ── UI State ───────────────────────────────────────────────
  const [showSettings, setShowSettings] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [historyRefresh, setHistoryRefresh] = useState(0)

  // ── Main Analysis Flow ──────────────────────────────────────
  const handleAnalyze = useCallback(async () => {
    if (selectedSymbols.length === 0) return
    if (!anthropicKey) {
      setShowSettings(true)
      return
    }

    setReport('')
    setOrders([])
    setAnalysisError(null)
    setIsFetchingMarket(true)
    setMarketError(null)
    let snap: MarketSnapshot

    try {
      snap = await fetchAllMarketData(selectedSymbols)
      setSnapshot(snap)
      setSelectorTickers((prev) => ({ ...prev, ...snap.tickers }))
    } catch (err) {
      const msg = err instanceof Error ? err.message : '获取市场数据失败'
      setMarketError(msg)
      setIsFetchingMarket(false)
      return
    }
    setIsFetchingMarket(false)
    setIsStreaming(true)

    const recordId = crypto.randomUUID()
    currentRecordId.current = recordId
    let fullText = ''
    await analyzeWithStreaming(
      provider,
      anthropicKey,
      { symbols: selectedSymbols, intent, period, amount },
      snap,
      (chunk) => {
        fullText += chunk
        setReport((prev) => prev + chunk)
      },
      async (complete) => {
        setIsStreaming(false)
        const parsedOrders = parseOrdersFromReport(complete)
        setOrders(parsedOrders)

        // Save to IndexedDB
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
  }, [selectedSymbols, intent, period, amount, anthropicKey])

  function handleOrdersExecuted(_results: OrderResult[]) {
    if (currentRecordId.current) {
      import('@/lib/indexdb').then(({ updateAnalysis }) =>
        updateAnalysis(currentRecordId.current!, { executed: true, executedAt: Date.now() }),
      )
      setHistoryRefresh((n) => n + 1)
    }
  }

  const isAnalyzing = isFetchingMarket || isStreaming
  const canAnalyze = selectedSymbols.length > 0 && !isAnalyzing

  return (
    <div className="flex flex-col h-dvh bg-bg-deep overflow-hidden">
      {/* ── Ambient Background ─────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(circle, #5e6ad2 0%, transparent 70%)' }}
        />
        <div
          className="absolute top-1/2 -right-32 w-80 h-80 rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #22c55e 0%, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-20 left-1/3 w-72 h-72 rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(circle, #f59e0b 0%, transparent 70%)' }}
        />
      </div>

      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-themed-dim glass flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-xl bg-accent/20 flex items-center justify-center animate-pulse-glow">
            <Zap className="size-4 text-accent" />
          </div>
          <div>
            <h1 className="text-sm font-heading font-black text-foreground tracking-wider">
              CRYPTOADVISOR
            </h1>
            <p className="text-[9px] text-muted font-mono tracking-widest uppercase">
              AI Investment Intelligence
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status */}
          {isAnalyzing && (
            <div className="flex items-center gap-1.5 glass rounded-xl px-3 py-1.5 text-xs text-accent font-mono">
              <RefreshCw className="size-3 animate-spin" />
              {isFetchingMarket ? '获取行情...' : 'AI 分析中...'}
            </div>
          )}
          {marketError && (
            <div className="flex items-center gap-1.5 bg-danger/10 border border-danger/20 rounded-xl px-3 py-1.5 text-xs text-danger font-mono">
              <AlertCircle className="size-3" />
              数据获取失败
            </div>
          )}

          <button
            onClick={() => setShowHistory(true)}
            className="size-9 rounded-xl glass flex items-center justify-center text-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            aria-label="查看历史记录"
          >
            <Clock className="size-4" />
          </button>
          <button
            onClick={toggleTheme}
            className="size-9 rounded-xl glass flex items-center justify-center text-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            aria-label={!mounted || theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
          >
            {!mounted || theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className={[
              'size-9 rounded-xl glass flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
              anthropicKey ? 'text-muted hover:text-foreground' : 'text-warning hover:text-warning/80',
            ].join(' ')}
            aria-label="API 设置"
          >
            <Settings className="size-4" />
          </button>
        </div>
      </header>

      {/* ── Main Layout ──────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-1 overflow-hidden">
        {/* ── LEFT: Config Panel ──────────────────────────────────── */}
        <aside className="w-72 flex-shrink-0 flex flex-col gap-0 border-r border-themed-dim overflow-y-auto">
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
              onClick={handleAnalyze}
            >
              {!isAnalyzing && <Zap className="size-4" />}
              {isAnalyzing ? (isFetchingMarket ? '获取行情...' : 'AI 分析中...') : '开始分析'}
            </Button>

            {!anthropicKey && (
              <button
                onClick={() => setShowSettings(true)}
                className="text-[10px] text-warning/70 font-mono text-center hover:text-warning transition-colors"
              >
                ⚠ 请先设置 API Key
              </button>
            )}
          </div>
        </aside>

        {/* ── CENTER: Market + Report ──────────────────────────────── */}
        <main className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {snapshot && (
            <div className="animate-fade-in">
              <MarketDataPanel
                snapshot={snapshot}
                selectedSymbols={selectedSymbols}
              />
            </div>
          )}

          <AnalysisReport
            report={report}
            isStreaming={isStreaming}
            error={analysisError}
          />
        </main>

        {/* ── RIGHT: Order Panel ──────────────────────────────────── */}
        <aside className="w-80 flex-shrink-0 border-l border-themed-dim overflow-y-auto p-4">
          <OrderPreview
            orders={orders}
            onOrdersExecuted={handleOrdersExecuted}
          />
        </aside>
      </div>

      {/* ── Modals ───────────────────────────────────────────────── */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        provider={provider}
        apiKey={anthropicKey}
        onSave={handleSaveKey}
      />

      <HistoryPanel
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        refreshTrigger={historyRefresh}
      />
    </div>
  )
}
