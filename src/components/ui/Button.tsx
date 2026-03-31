'use client'

import { type ReactNode, type ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  children: ReactNode
}

const variantStyles: Record<Variant, string> = {
  primary:
    'bg-accent hover:bg-accent/90 text-white shadow-[0_0_20px_rgba(94,106,210,0.3)] hover:shadow-[0_0_30px_rgba(94,106,210,0.5)]',
  secondary: 'glass hover:bg-surface text-foreground',
  ghost: 'hover:bg-surface text-muted hover:text-foreground',
  danger: 'bg-danger/10 hover:bg-danger/20 text-danger border border-danger/20',
}

const sizeStyles: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-xl font-mono font-medium',
        'transition-all duration-200 active:scale-95',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
        variantStyles[variant],
        sizeStyles[size],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {loading && (
        <span className="size-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  )
}
