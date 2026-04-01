'use client'

import { useState, useEffect, useCallback } from 'react'
import type { AIProvider } from '@/types'

const SESSION_PROVIDER_KEY = 'ai_provider'
const SESSION_APIKEY_KEY = 'ai_api_key'

/**
 * 管理 AI Provider 和 API Key 的持久化
 * - 存储在 localStorage，跨标签页、跨会话保留
 * - 仅在客户端读写，SSR 阶段返回默认值
 */
export function useSession() {
  const [provider, setProvider] = useState<AIProvider>('openai')
  const [apiKey, setApiKey] = useState('')

  // 客户端 mount 后从 localStorage 恢复
  useEffect(() => {
    const storedProvider = localStorage.getItem(SESSION_PROVIDER_KEY) as AIProvider | null
    const storedKey = localStorage.getItem(SESSION_APIKEY_KEY)
    if (storedProvider) setProvider(storedProvider)
    if (storedKey) setApiKey(storedKey)
  }, [])

  const saveSession = useCallback((nextProvider: AIProvider, nextKey: string) => {
    setProvider(nextProvider)
    setApiKey(nextKey)
    localStorage.setItem(SESSION_PROVIDER_KEY, nextProvider)
    if (nextKey) localStorage.setItem(SESSION_APIKEY_KEY, nextKey)
    else localStorage.removeItem(SESSION_APIKEY_KEY)
  }, [])

  return { provider, apiKey, saveSession }
}
