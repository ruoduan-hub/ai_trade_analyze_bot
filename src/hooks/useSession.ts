'use client'

import { useState, useEffect, useCallback } from 'react'
import type { AIProvider } from '@/types'

const SESSION_PROVIDER_KEY = 'ai_provider'
const SESSION_APIKEY_KEY = 'ai_api_key'

/**
 * 管理 AI Provider 和 API Key 的 sessionStorage 持久化
 * - 仅在客户端读写，SSR 阶段返回默认值
 * - 关闭标签页即清除，不写入 localStorage
 */
export function useSession() {
  const [provider, setProvider] = useState<AIProvider>('openai')
  const [apiKey, setApiKey] = useState('')

  // 客户端 mount 后从 sessionStorage 恢复
  useEffect(() => {
    const storedProvider = sessionStorage.getItem(SESSION_PROVIDER_KEY) as AIProvider | null
    const storedKey = sessionStorage.getItem(SESSION_APIKEY_KEY)
    if (storedProvider) setProvider(storedProvider)
    if (storedKey) setApiKey(storedKey)
  }, [])

  const saveSession = useCallback((nextProvider: AIProvider, nextKey: string) => {
    setProvider(nextProvider)
    setApiKey(nextKey)
    sessionStorage.setItem(SESSION_PROVIDER_KEY, nextProvider)
    if (nextKey) sessionStorage.setItem(SESSION_APIKEY_KEY, nextKey)
    else sessionStorage.removeItem(SESSION_APIKEY_KEY)
  }, [])

  return { provider, apiKey, saveSession }
}
