/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['ccxt'],

  // Proxy external market data APIs to avoid browser CORS restrictions.
  // The browser calls /proxy/*, Next.js forwards server-side — no CORS header needed.
  async rewrites() {
    return [
      {
        source: '/proxy/coinpaprika/:path*',
        destination: 'https://api.coinpaprika.com/:path*',
      },
      {
        source: '/proxy/alternative/:path*',
        destination: 'https://api.alternative.me/:path*',
      },
      {
        source: '/proxy/llama/:path*',
        destination: 'https://api.llama.fi/:path*',
      },
      {
        source: '/proxy/coindesk/:path*',
        destination: 'https://data-api.coindesk.com/:path*',
      },
      {
        source: '/proxy/coingecko/:path*',
        destination: 'https://api.coingecko.com/:path*',
      },
      {
        source: '/proxy/binfutures/:path*',
        destination: 'https://fapi.binance.com/:path*',
      },
      {
        source: '/proxy/mempool/:path*',
        destination: 'https://mempool.space/:path*',
      },
    ]
  },
}

module.exports = nextConfig
