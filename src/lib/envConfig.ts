// 交易环境配置
export type TradeEnv = 'test' | 'production'

export const ENV_CONFIG = {
  test: {
    label: '测试环境',
    labelEn: 'Testnet',
    url: 'https://api.bydtms.com/api',
    color: 'warning' as const,
  },
  production: {
    label: '正式环境',
    labelEn: 'Mainnet',
    url: 'https://api.bydfi.com/api',
    color: 'success' as const,
  },
} as const

const STORAGE_KEY = 'trade_env'

export function loadTradeEnv(): TradeEnv {
  if (typeof window === 'undefined') return 'test'
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === 'production' ? 'production' : 'test'
}

export function saveTradeEnv(env: TradeEnv): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, env)
}

export function getEnvApiUrl(env: TradeEnv): string {
  return ENV_CONFIG[env].url
}
