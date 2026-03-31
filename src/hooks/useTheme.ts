'use client'

import { useState, useEffect, useCallback } from 'react'

export type Theme = 'dark' | 'light'

const STORAGE_KEY = 'theme'

// All colour values live in globals.css :root[data-theme] selectors.
// This function only needs to set the attribute — CSS handles the rest.
function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme)
}

export function useTheme() {
  // SSR 阶段固定为 'dark'，客户端 mount 后再同步 localStorage，避免 hydration mismatch
  const [theme, setTheme] = useState<Theme>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null
    const resolved = stored ??
      (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
    setTheme(resolved)
    applyTheme(resolved)
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    applyTheme(theme)
  }, [theme, mounted])

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark'
      localStorage.setItem(STORAGE_KEY, next)
      applyTheme(next)
      return next
    })
  }, [])

  return { theme, toggleTheme, mounted }
}
