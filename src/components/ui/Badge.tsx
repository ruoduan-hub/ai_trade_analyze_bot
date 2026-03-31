'use client'

import { type ReactNode } from 'react'

type Variant = 'success' | 'danger' | 'warning' | 'info' | 'neutral'

interface BadgeProps {
  variant?: Variant
  children: ReactNode
  className?: string
}

const variantStyles: Record<Variant, string> = {
  success: 'bg-success/10 text-success border-success/20',
  danger: 'bg-danger/10 text-danger border-danger/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  info: 'bg-accent/10 text-accent border-accent/20',
  neutral: 'bg-white/5 text-muted border-white/10',
}

export function Badge({ variant = 'neutral', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono border ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  )
}
