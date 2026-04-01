'use client'

import { SlidersHorizontal, FileText, ShoppingCart } from 'lucide-react'
import { useLocale } from '@/contexts/LocaleContext'

export type MobileTab = 'config' | 'report' | 'order'

interface MobileTabBarProps {
  /** 当前激活的 tab */
  activeTab: MobileTab
  /** 是否正在分析（report tab 显示脉冲指示器） */
  isAnalyzing: boolean
  onChange: (tab: MobileTab) => void
}

/**
 * 移动端底部 Tab 导航栏（lg 以上隐藏）
 * - 三个 tab：配置 / 报告 / 订单
 * - 报告 tab 在分析中时显示脉冲指示器
 */
export function MobileTabBar({ activeTab, isAnalyzing, onChange }: MobileTabBarProps) {
  const { t } = useLocale()

  const TABS: { id: MobileTab; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'config', label: t.mobileTabBar.config, Icon: SlidersHorizontal },
    { id: 'report', label: t.mobileTabBar.report, Icon: FileText },
    { id: 'order', label: t.mobileTabBar.order, Icon: ShoppingCart },
  ]

  return (
    <nav className="lg:hidden relative z-10 flex-shrink-0 flex border-t border-themed-dim glass">
      {TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={[
            'flex-1 flex flex-col items-center justify-center gap-1 py-3 text-[10px] font-mono transition-colors',
            activeTab === id ? 'text-accent' : 'text-muted hover:text-foreground',
          ].join(' ')}
          aria-label={label}
          aria-pressed={activeTab === id}
        >
          <Icon className="size-5" />
          {label}
          {/* 分析中时在报告 tab 显示脉冲点 */}
          {id === 'report' && isAnalyzing && (
            <span className="absolute top-2 w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          )}
        </button>
      ))}
    </nav>
  )
}
