import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Suppress ccxt server-side warning (it's only used client-side)
  turbopack: {},
  serverExternalPackages: ['ccxt'],
}

export default nextConfig
