'use client'

import {
  Settings, Clock, Zap, RefreshCw, AlertCircle,
  Sun, Moon, ChevronDown, Globe, Check, MoreHorizontal, X,
} from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import type { Theme } from '@/hooks/useTheme'
import { useLocale } from '@/contexts/LocaleContext'

interface AppHeaderProps {
  theme: Theme
  mounted: boolean
  isFetchingMarket: boolean
  isStreaming: boolean
  marketError: string | null
  hasApiKey: boolean
  onToggleTheme: () => void
  onOpenHistory: () => void
  onOpenSettings: () => void
}

const LANGS = [
  { value: 'zh' as const, label: '中文', code: 'ZH' },
  { value: 'en' as const, label: 'English', code: 'EN' },
]

/**
 * 桌面端语言切换下拉（独立抽出方便复用）
 */
function LangDropdown({
  locale,
  setLocale,
  t,
}: {
  locale: 'zh' | 'en'
  setLocale: (v: 'zh' | 'en') => void
  t: ReturnType<typeof useLocale>['t']
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onMouse = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onMouse)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onMouse)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        aria-label={t.header.switchLangAriaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={[
          'relative h-9 pl-2.5 pr-2 rounded-xl flex items-center gap-1.5 cursor-pointer',
          'border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
          'active:scale-[0.97]',
          open
            ? 'border-accent/40 bg-accent/10 text-accent shadow-[0_0_14px_rgba(94,106,210,0.22)]'
            : 'border-themed bg-foreground/5 text-muted hover:border-foreground/15 hover:bg-foreground/8 hover:text-foreground',
        ].join(' ')}
      >
        <Globe className={`size-3.5 flex-shrink-0 transition-colors duration-200 ${open ? 'text-accent' : ''}`} />
        <span className="text-[11px] font-mono font-semibold tracking-widest select-none">
          {locale.toUpperCase()}
        </span>
        <ChevronDown className={`size-3 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      <div
        role="listbox"
        aria-label={t.header.switchLangAriaLabel}
        className="absolute right-0 top-full mt-2 w-36 rounded-2xl z-50 overflow-hidden"
        style={{
          opacity: open ? 1 : 0,
          transform: open ? 'translateY(0) scale(1)' : 'translateY(-6px) scale(0.96)',
          transformOrigin: 'top right',
          transition: 'opacity 150ms ease, transform 150ms ease',
          pointerEvents: open ? 'auto' : 'none',
          background: 'var(--dropdown-bg)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid var(--dropdown-border)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.3), 0 0 0 1px rgba(94,106,210,0.08) inset',
        }}
      >
        <div className="h-[2px] w-full bg-gradient-to-r from-accent/60 via-accent/30 to-transparent" />
        <div className="px-3 pt-2.5 pb-1.5 flex items-center gap-1.5">
          <Globe className="size-2.5 text-muted/50 flex-shrink-0" />
          <span className="text-[9px] font-mono tracking-[0.15em] text-muted/50 uppercase select-none">Language</span>
        </div>
        <div className="mx-3 h-px bg-border-dim mb-1" />
        <div className="px-1.5 pb-1.5 flex flex-col gap-0.5">
          {LANGS.map(lang => {
            const isActive = locale === lang.value
            return (
              <button
                key={lang.value}
                role="option"
                aria-selected={isActive}
                onClick={() => { setLocale(lang.value); setOpen(false) }}
                className={[
                  'relative w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl cursor-pointer',
                  'text-xs font-mono transition-all duration-150 focus-visible:outline-none',
                  'focus-visible:ring-1 focus-visible:ring-accent/50',
                  isActive
                    ? 'text-accent bg-accent/12'
                    : 'text-muted hover:text-foreground hover:bg-white/6 active:bg-white/10',
                ].join(' ')}
              >
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] rounded-full transition-all duration-200"
                  style={{
                    height: isActive ? '60%' : '0%',
                    background: 'var(--color-accent)',
                    opacity: isActive ? 1 : 0,
                  }}
                />
                <span className={[
                  'text-[9px] font-mono font-bold tracking-widest px-1 py-0.5 rounded-md',
                  'border transition-colors duration-150 select-none',
                  isActive
                    ? 'text-accent border-accent/40 bg-accent/15'
                    : 'text-muted/60 border-themed bg-foreground/4',
                ].join(' ')}>
                  {lang.code}
                </span>
                <span className="flex-1 text-left tracking-wide">{lang.label}</span>
                {isActive && <Check className="size-3 text-accent flex-shrink-0" />}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/**
 * 移动端 More 弹出面板（从右侧滑入）
 */
function MobileMorePanel({
  open,
  onClose,
  theme,
  mounted,
  isFetchingMarket,
  isStreaming,
  marketError,
  hasApiKey,
  onToggleTheme,
  onOpenHistory,
  onOpenSettings,
  locale,
  setLocale,
  t,
}: {
  open: boolean
  onClose: () => void
  theme: Theme
  mounted: boolean
  isFetchingMarket: boolean
  isStreaming: boolean
  marketError: string | null
  hasApiKey: boolean
  onToggleTheme: () => void
  onOpenHistory: () => void
  onOpenSettings: () => void
  locale: 'zh' | 'en'
  setLocale: (v: 'zh' | 'en') => void
  t: ReturnType<typeof useLocale>['t']
}) {
  const isAnalyzing = isFetchingMarket || isStreaming

  // 关闭时 body 滚动恢复
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  // ESC 关闭
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const menuItem = (
    icon: React.ReactNode,
    label: string,
    onClick: () => void,
    variant: 'default' | 'warning' | 'accent' = 'default',
    delay = 0,
  ) => (
    <button
      onClick={() => { onClick(); onClose() }}
      className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all duration-200 active:scale-[0.97] text-left group"
      style={{
        opacity: open ? 1 : 0,
        transform: open ? 'translateX(0)' : 'translateX(20px)',
        transition: `opacity 300ms cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 300ms cubic-bezier(0.16,1,0.3,1) ${delay}ms, background 150ms ease`,
        background: 'transparent',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = 'transparent'
      }}
    >
      <span className={[
        'size-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200',
        'border group-hover:border-accent/30 group-hover:bg-accent/10 group-hover:text-accent',
        variant === 'warning'
          ? 'border-warning/30 bg-warning/10 text-warning'
          : variant === 'accent'
            ? 'border-accent/30 bg-accent/10 text-accent'
            : 'border-themed bg-foreground/5 text-muted',
      ].join(' ')}>
        {icon}
      </span>
      <span className={[
        'text-sm font-mono tracking-wide transition-colors duration-200',
        variant === 'warning' ? 'text-warning' : 'text-foreground/80 group-hover:text-foreground',
      ].join(' ')}>
        {label}
      </span>
    </button>
  )

  return (
    <>
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 z-40 md:hidden"
        style={{
          background: 'rgba(2,2,3,0.6)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 250ms cubic-bezier(0.16,1,0.3,1)',
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 面板本体 */}
      <div
        role="dialog"
        aria-modal="true"
        className="fixed top-0 right-0 h-full z-50 md:hidden flex flex-col"
        style={{
          width: 'min(280px, 85vw)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 350ms cubic-bezier(0.16,1,0.3,1)',
          background: 'var(--dropdown-bg)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          borderLeft: '1px solid var(--dropdown-border)',
        }}
      >
        {/* 顶部装饰线 */}
        <div
          className="h-[1px] w-full flex-shrink-0"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(94,106,210,0.6), rgba(94,106,210,0.3), transparent)',
          }}
        />

        {/* 面板头部 */}
        <div
          className="flex items-center justify-between px-5 pt-5 pb-4 flex-shrink-0"
          style={{
            opacity: open ? 1 : 0,
            transform: open ? 'translateX(0)' : 'translateX(16px)',
            transition: 'opacity 300ms cubic-bezier(0.16,1,0.3,1) 50ms, transform 300ms cubic-bezier(0.16,1,0.3,1) 50ms',
          }}
        >
          <div className="flex items-center gap-2.5">
            <div className="size-6 rounded-lg bg-accent/20 flex items-center justify-center">
              <Zap className="size-3.5 text-accent" />
            </div>
            <span className="text-[10px] font-mono tracking-[0.2em] text-muted uppercase">Menu</span>
          </div>
          <button
            onClick={onClose}
            className="size-8 rounded-xl border border-themed bg-foreground/5 flex items-center justify-center text-muted hover:text-foreground hover:bg-foreground/10 transition-all duration-150 active:scale-[0.93]"
            aria-label="关闭菜单"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {/* 状态栏 — 仅在有状态时显示 */}
        {(isAnalyzing || marketError) && (
          <div
            className="mx-4 mb-3 flex-shrink-0"
            style={{
              opacity: open ? 1 : 0,
              transform: open ? 'translateX(0)' : 'translateX(16px)',
              transition: 'opacity 300ms cubic-bezier(0.16,1,0.3,1) 80ms, transform 300ms cubic-bezier(0.16,1,0.3,1) 80ms',
            }}
          >
            {isAnalyzing && (
              <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs text-accent font-mono border border-accent/20 bg-accent/8">
                <RefreshCw className="size-3 animate-spin flex-shrink-0" />
                <span>{isFetchingMarket ? t.header.fetchingMarket : t.header.analyzing}</span>
              </div>
            )}
            {marketError && !isAnalyzing && (
              <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs text-danger font-mono border border-danger/20 bg-danger/8">
                <AlertCircle className="size-3 flex-shrink-0" />
                <span>{t.header.fetchError}</span>
              </div>
            )}
          </div>
        )}

        {/* 分隔线 */}
        <div className="mx-4 h-px bg-border-dim flex-shrink-0" style={{
          opacity: open ? 1 : 0,
          transition: 'opacity 300ms ease 100ms',
        }} />

        {/* 菜单项列表 */}
        <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-0.5">

          {/* 语言切换 — 特殊：直接切换不关闭 */}
          <div
            className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl"
            style={{
              opacity: open ? 1 : 0,
              transform: open ? 'translateX(0)' : 'translateX(20px)',
              transition: 'opacity 300ms cubic-bezier(0.16,1,0.3,1) 120ms, transform 300ms cubic-bezier(0.16,1,0.3,1) 120ms',
            }}
          >
            <span className="size-9 rounded-xl flex items-center justify-center flex-shrink-0 border border-themed bg-foreground/5 text-muted">
              <Globe className="size-4" />
            </span>
            <span className="text-sm font-mono tracking-wide text-foreground/80 flex-1">
              {t.header.switchLangAriaLabel}
            </span>

            {/* 语言 pill 切换器 */}
            <div
              className="flex rounded-xl overflow-hidden border border-themed bg-foreground/4 p-0.5 gap-0.5"
            >
              {LANGS.map(lang => (
                <button
                  key={lang.value}
                  onClick={() => setLocale(lang.value)}
                  className={[
                    'px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold tracking-widest transition-all duration-200',
                    locale === lang.value
                      ? 'bg-accent text-white shadow-[0_2px_8px_rgba(94,106,210,0.4)]'
                      : 'text-muted hover:text-foreground',
                  ].join(' ')}
                >
                  {lang.code}
                </button>
              ))}
            </div>
          </div>

          {menuItem(
            <Clock className="size-4" />,
            t.header.historyAriaLabel,
            onOpenHistory,
            'default',
            150,
          )}

          {/* 主题切换 — 带状态标签 */}
          <button
            onClick={() => { onToggleTheme() }}
            className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all duration-200 active:scale-[0.97] text-left group"
            style={{
              opacity: open ? 1 : 0,
              transform: open ? 'translateX(0)' : 'translateX(20px)',
              transition: 'opacity 300ms cubic-bezier(0.16,1,0.3,1) 180ms, transform 300ms cubic-bezier(0.16,1,0.3,1) 180ms',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'transparent'
            }}
          >
            <span className="size-9 rounded-xl flex items-center justify-center flex-shrink-0 border border-themed bg-foreground/5 text-muted transition-all duration-200 group-hover:border-accent/30 group-hover:bg-accent/10 group-hover:text-accent">
              {!mounted || theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </span>
            <span className="text-sm font-mono tracking-wide text-foreground/80 group-hover:text-foreground transition-colors duration-200 flex-1">
              {!mounted || theme === 'dark' ? t.header.toggleLightMode : t.header.toggleDarkMode}
            </span>
            {/* 当前状态 pill */}
            <span className="text-[10px] font-mono tracking-widest text-muted border border-themed bg-foreground/4 px-2 py-0.5 rounded-lg select-none">
              {!mounted || theme === 'dark' ? 'DARK' : 'LIGHT'}
            </span>
          </button>

          {menuItem(
            <Settings className="size-4" />,
            t.header.settingsAriaLabel,
            onOpenSettings,
            hasApiKey ? 'default' : 'warning',
            210,
          )}
        </div>

        {/* 底部品牌水印 */}
        <div
          className="flex-shrink-0 px-5 pb-6 pt-3 flex items-center gap-2 border-t border-themed"
          style={{
            opacity: open ? 0.4 : 0,
            transition: 'opacity 400ms ease 300ms',
          }}
        >
          <Zap className="size-3 text-accent" />
          <span className="text-[9px] font-mono tracking-[0.25em] text-muted uppercase">CryptoAdvisor AI</span>
        </div>
      </div>
    </>
  )
}

/**
 * 顶部导航栏
 * - 左侧：品牌 Logo + 名称
 * - 桌面右侧：状态指示器 + 历史/语言/主题/设置按钮
 * - 移动右侧：单个 More 按钮，点击后右侧滑入菜单面板
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
  const [moreOpen, setMoreOpen] = useState(false)

  return (
    <>
      <header className="relative z-20 flex items-center justify-between px-6 py-4 border-b border-themed-dim glass flex-shrink-0">
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

        {/* ── 桌面端右侧操作区 ── */}
        <div className="hidden md:flex items-center gap-2">
          {isAnalyzing && (
            <div className="flex items-center gap-1.5 glass rounded-xl px-3 py-1.5 text-xs text-accent font-mono">
              <RefreshCw className="size-3 animate-spin" />
              {isFetchingMarket ? t.header.fetchingMarket : t.header.analyzing}
            </div>
          )}
          {marketError && (
            <div className="flex items-center gap-1.5 bg-danger/10 border border-danger/20 rounded-xl px-3 py-1.5 text-xs text-danger font-mono">
              <AlertCircle className="size-3" />
              {t.header.fetchError}
            </div>
          )}
          <LangDropdown locale={locale} setLocale={setLocale} t={t} />
          <button
            onClick={onOpenHistory}
            className="size-9 rounded-xl glass flex items-center justify-center text-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            aria-label={t.header.historyAriaLabel}
          >
            <Clock className="size-4" />
          </button>
          <button
            onClick={onToggleTheme}
            className="size-9 rounded-xl glass flex items-center justify-center text-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            aria-label={!mounted || theme === 'dark' ? t.header.toggleLightMode : t.header.toggleDarkMode}
          >
            {!mounted || theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
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

        {/* ── 移动端右侧：More 按钮 ── */}
        <div className="flex md:hidden items-center gap-2">
          {/* 紧凑状态点 */}
          {isAnalyzing && (
            <span className="size-2 rounded-full bg-accent animate-pulse flex-shrink-0" />
          )}
          {marketError && !isAnalyzing && (
            <span className="size-2 rounded-full bg-danger flex-shrink-0" />
          )}
          {!hasApiKey && (
            <span className="size-2 rounded-full bg-warning flex-shrink-0" />
          )}

          <button
            onClick={() => setMoreOpen(true)}
            aria-label="更多选项"
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            className={[
              'size-9 rounded-xl flex items-center justify-center transition-all duration-200',
              'border active:scale-[0.93] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
              moreOpen
                ? 'border-accent/40 bg-accent/10 text-accent'
                : 'border-themed bg-foreground/5 text-muted hover:border-foreground/15 hover:text-foreground',
            ].join(' ')}
          >
            <MoreHorizontal className="size-4" />
          </button>
        </div>
      </header>

      {/* 移动端 More 面板（Portal-like：渲染在 header 外，fixed 定位） */}
      <MobileMorePanel
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        theme={theme}
        mounted={mounted}
        isFetchingMarket={isFetchingMarket}
        isStreaming={isStreaming}
        marketError={marketError}
        hasApiKey={hasApiKey}
        onToggleTheme={onToggleTheme}
        onOpenHistory={() => { onOpenHistory(); setMoreOpen(false) }}
        onOpenSettings={() => { onOpenSettings(); setMoreOpen(false) }}
        locale={locale}
        setLocale={setLocale}
        t={t}
      />
    </>
  )
}
