'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
import { translations, type Locale } from '@/lib/i18n'

type AnyTranslations = typeof translations[Locale]

interface LocaleContextValue {
  locale: Locale
  setLocale: (l: Locale) => void
  t: AnyTranslations
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

interface LocaleProviderProps {
  children: ReactNode
  /**
   * Passed from the Server Component (layout.tsx) which reads the Cookie.
   * Because this prop comes from the server, both SSR and client hydration
   * start with the same value — no mismatch, no flash.
   */
  initialLocale: Locale
}

export function LocaleProvider({ children, initialLocale }: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale)

  function setLocale(l: Locale) {
    setLocaleState(l)
    // Write a long-lived cookie so the server renders the correct locale on
    // the next request.
    document.cookie = `locale=${l}; path=/; max-age=31536000; SameSite=Lax`
    // Keep the attribute in sync for any code that reads it directly.
    document.documentElement.setAttribute('data-locale', l)
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t: translations[locale] }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useLocale must be used inside LocaleProvider')
  return ctx
}
