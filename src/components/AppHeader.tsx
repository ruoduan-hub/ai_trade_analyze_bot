'use client'

import { Settings, Clock, Zap, RefreshCw, AlertCircle, Sun, Moon } from 'lucide-react'
import type { Theme } from '@/hooks/useTheme'
import { useLocale } from '@/contexts/LocaleContext'

interface AppHeaderProps {
  /** 当前主题，用于切换图标 */
  theme: Theme
  /** 主题是否已在客户端 mount（避免 hydration 闪烁） */
  mounted: boolean
  /** 是否正在获取行情数据 */
  isFetchingMarket: boolean
  /** 是否正在 AI 流式输出 */
  isStreaming: boolean
  /** 行情获取错误信息 */
  marketError: string | null
  /** AI API Key 是否已配置 */
  hasApiKey: boolean
  onToggleTheme: () => void
  onOpenHistory: () => void
  onOpenSettings: () => void
}

/**
 * 顶部导航栏
 * - 左侧：品牌 Logo + 名称
 * - 右侧：状态指示器 + 历史/语言/主题/设置按钮
 */
export function AppHeader({
  theme,
  mounted,
  isFetchingMarket,
  isStreaming,
  marketError,
  hasApiKey,
  onToggleTheme,
  onOpenHistory,
  onOpenSettings,
}: AppHeaderProps) {
  const isAnalyzing = isFetchingMarket || isStreaming
  const { locale, setLocale, t } = useLocale()

  return (
    <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-themed-dim glass flex-shrink-0">
      {/* 品牌区域 */}
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

      {/* 右侧操作区 */}
      <div className="flex items-center gap-2">
        {/* 分析状态指示器 */}
        {isAnalyzing && (
          <div className="flex items-center gap-1.5 glass rounded-xl px-3 py-1.5 text-xs text-accent font-mono">
            <RefreshCw className="size-3 animate-spin" />
            {isFetchingMarket ? t.header.fetchingMarket : t.header.analyzing}
          </div>
        )}

        {/* 行情错误提示 */}
        {marketError && (
          <div className="flex items-center gap-1.5 bg-danger/10 border border-danger/20 rounded-xl px-3 py-1.5 text-xs text-danger font-mono">
            <AlertCircle className="size-3" />
            {t.header.fetchError}
          </div>
        )}

        {/* 历史记录按钮 */}
        <button
          onClick={onOpenHistory}
          className="size-9 rounded-xl glass flex items-center justify-center text-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          aria-label={t.header.historyAriaLabel}
        >
          <Clock className="size-4" />
        </button>

        {/* 语言切换按钮 */}
        <button
          onClick={() => setLocale(locale === 'zh' ? 'en' : 'zh')}
          className="size-9 rounded-xl glass flex items-center justify-center text-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 text-[11px] font-mono font-semibold tracking-wide"
          aria-label={t.header.switchLangAriaLabel}
        >
          {t.header.switchLang}
        </button>

        {/* 主题切换按钮 */}
        <button
          onClick={onToggleTheme}
          className="size-9 rounded-xl glass flex items-center justify-center text-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          aria-label={!mounted || theme === 'dark' ? t.header.toggleLightMode : t.header.toggleDarkMode}
        >
          {!mounted || theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>

        {/* 设置按钮（未配置 Key 时高亮警告） */}
        <button
          onClick={onOpenSettings}
          className={[
            'size-9 rounded-xl glass flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
            hasApiKey ? 'text-muted hover:text-foreground' : 'text-warning hover:text-warning/80',
          ].join(' ')}
          aria-label={t.header.settingsAriaLabel}
        >
          <Settings className="size-4" />
        </button>
      </div>
    </header>
  )
}
