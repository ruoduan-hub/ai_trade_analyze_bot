/**
 * /api/analyze — 服务端 AI 分析路由
 *
 * 职责：
 *   1. 接收客户端传来的 { apiKey, config, snapshot }
 *   2. 用 buildPrompt 组装投资分析 Prompt
 *   3. 直接调用智谱 OpenAI 兼容接口（SSE），流式返回文本
 */

import type { AIProvider, InvestmentConfig, MarketSnapshot } from '@/types'

// ─── 投资风格 / 周期 的中文描述映射 ─────────────────────────────
const INTENT_LABELS: Record<string, string> = {
  aggressive:   '进取型（高风险高回报，可接受较大回撤）',
  steady:       '稳健型（中等风险，追求稳定增长）',
  conservative: '保守型（低风险，资本保全优先）',
}

const PERIOD_LABELS: Record<string, string> = {
  short: '短期（1个月以内）',
  mid:   '中期（1~6个月）',
  long:  '长期（6个月以上）',
}

function buildPrompt(config: InvestmentConfig, snapshot: MarketSnapshot): string {
  const tickerSection = Object.entries(snapshot.tickers)
    .map(([symbol, t]) => {
      const changeSign = t.change24h >= 0 ? '+' : ''
      return `**${symbol}**
  - 当前价格: $${t.price.toLocaleString('en-US', { maximumFractionDigits: 6 })}
  - 24h涨跌: ${changeSign}${t.change24h.toFixed(2)}%
  - 24h成交量: $${(t.volume24h / 1e6).toFixed(2)}M
  - 24h高/低: $${t.high24h.toLocaleString()} / $${t.low24h.toLocaleString()}${
        t.marketCap ? `\n  - 市值: $${(t.marketCap / 1e9).toFixed(2)}B` : ''
      }`
    })
    .join('\n\n')

  const fgSection = snapshot.fearGreed
    ? `- 恐惧贪婪指数: ${snapshot.fearGreed.value}/100（${snapshot.fearGreed.valueText}）`
    : '- 恐惧贪婪指数: 数据不可用'

  const defiSection = snapshot.defiTvl
    ? `- 以太坊 DeFi TVL: $${(snapshot.defiTvl / 1e9).toFixed(2)}B`
    : ''

  const globalSection = snapshot.globalMarket
    ? [
        `- 全球加密市场总市值: $${(snapshot.globalMarket.totalMarketCapUsd / 1e12).toFixed(2)}T（24h ${snapshot.globalMarket.marketCapChange24hPercent >= 0 ? '+' : ''}${snapshot.globalMarket.marketCapChange24hPercent.toFixed(2)}%）`,
        `- BTC 市值主导率: ${snapshot.globalMarket.btcDominance.toFixed(1)}%`,
        `- ETH 市值主导率: ${snapshot.globalMarket.ethDominance.toFixed(1)}%`,
        `- 活跃加密货币数量: ${snapshot.globalMarket.activeCryptocurrencies.toLocaleString()}`,
      ].join('\n')
    : ''

  const derivativesSection = (() => {
    const lines: string[] = []
    if (snapshot.fundingRates && Object.keys(snapshot.fundingRates).length > 0) {
      lines.push('**资金费率（永续合约，8h 周期）**')
      for (const [symbol, rate] of Object.entries(snapshot.fundingRates)) {
        const pct = (rate * 100).toFixed(4)
        const sentiment = rate > 0 ? '多头主导（看涨偏好）' : rate < 0 ? '空头主导（看跌偏好）' : '中性'
        lines.push(`- ${symbol}: ${rate >= 0 ? '+' : ''}${pct}% → ${sentiment}`)
      }
    }
    if (snapshot.openInterest && Object.keys(snapshot.openInterest).length > 0) {
      lines.push('**未平仓合约（Open Interest）**')
      for (const [symbol, oi] of Object.entries(snapshot.openInterest)) {
        lines.push(`- ${symbol}: $${(oi / 1e9).toFixed(2)}B`)
      }
    }
    return lines.join('\n')
  })()

  const btcOnchainSection = snapshot.btcOnchain
    ? [
        `- BTC Mempool 待确认交易数: ${snapshot.btcOnchain.mempoolTxCount.toLocaleString()}`,
        `- 推荐 Gas 费率（最快/30分钟/1小时）: ${snapshot.btcOnchain.fastestFeeRate} / ${snapshot.btcOnchain.halfHourFeeRate} / ${snapshot.btcOnchain.hourFeeRate} sat/vB`,
      ].join('\n')
    : ''

  const newsSection =
    snapshot.news.length > 0
      ? snapshot.news.slice(0, 5).map((n) => `- [${n.title}](${n.url})`).join('\n')
      : '暂无最新新闻'

  return `你是一名专业的加密货币投资顾问，具备丰富的技术分析和基本面分析经验。

## 用户投资画像
- **投资风格**: ${INTENT_LABELS[config.intent]}
- **投资周期**: ${PERIOD_LABELS[config.period]}
- **投资金额**: $${config.amount.toLocaleString()} USDT
- **分析标的**: ${config.symbols.join(', ')}

## 实时市场数据（${new Date(snapshot.fetchedAt).toLocaleString('zh-CN')}）

### 价格行情
${tickerSection}

### 全球市场概览
${globalSection || '- 数据不可用'}

### 市场情绪
${fgSection}
${defiSection}

### 衍生品市场
${derivativesSection || '- 数据不可用'}

### BTC 链上数据
${btcOnchainSection || '- 数据不可用'}

### 最新资讯
${newsSection}

---

## 分析要求

请基于以上数据，提供专业的投资分析报告，报告需包含：

1. **市场综合评估** — 整体牛熊判断（结合 BTC 主导率、总市值变化、恐惧贪婪指数）
2. **衍生品情绪解读** — 结合资金费率（多空情绪）和未平仓合约（市场杠杆水平）分析当前市场结构
3. **逐币分析** — 对每个标的进行技术面+基本面分析，给出明确的 买入/卖出/持有 建议
4. **风险评估** — 结合用户的投资风格，说明主要风险点；如果资金费率极高（>0.05%）或 OI 异常大，需额外提示强平风险
5. **仓位建议** — 根据投资金额（$${config.amount} USDT），给出各币种的建议仓位比例
6. **关键价位** — 建议的入场价、止损价（Stop Loss）、止盈价（Take Profit）

报告用中文撰写，使用 Markdown 格式，简洁专业。

---

## 输出格式要求

先输出分析报告的正文 Markdown，然后**在报告末尾**输出一个 JSON 代码块，包含可直接用于 CCXT 下单的订单数组。

**字段说明（每个字段必须根据分析结果动态决定，不得照搬示例值）**：

| 字段 | 类型 | 说明 |
|------|------|------|
| symbol | string | 交易对，如 "BTC/USDT" |
| type | "limit" \| "market" | 若有明确入场价则用 "limit"；若建议立即以当前市价买入/卖出则用 "market" |
| side | "buy" \| "sell" | 根据逐币分析的建议严格填写：建议买入→"buy"，建议卖出→"sell" |
| amount | number | 根据仓位建议和当前价格换算的买卖数量（单位：标的币，非 USDT） |
| price | number \| null | type 为 "limit" 时填建议入场价；type 为 "market" 时设为 null |
| reasoning | string | 一句话说明下单理由（技术/基本面依据） |
| params.stopLoss | number | 止损价，必填 |
| params.takeProfit | number | 止盈价，必填 |

JSON 格式示例结构（值仅为占位，实际值由你的分析决定）：

\`\`\`json
[
  {
    "symbol": "<交易对>",
    "type": "<limit 或 market>",
    "side": "<buy 或 sell>",
    "amount": "<根据仓位计算的数量>",
    "price": "<入场价或 null>",
    "reasoning": "<下单理由>",
    "params": {
      "stopLoss": "<止损价>",
      "takeProfit": "<止盈价>"
    }
  }
]
\`\`\`

**规则**：
- 只包含你明确建议操作的币种，不操作的省略
- type / side / price / amount / stopLoss / takeProfit 必须全部基于上方分析中给出的建议价位和仓位比例填写，不得使用任意示例数字
- amount 须用 $${config.amount} USDT × 仓位比例 ÷ 入场价 计算
- 所有价格单位为 USDT，数量单位为标的币`
}

// ─── Provider 配置 ───────────────────────────────────────────
const PROVIDER_CONFIG: Record<
  AIProvider,
  { url: string; model: string; authHeader: (key: string) => Record<string, string> }
> = {
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o',
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
  },
  anthropic: {
    url: 'https://api.anthropic.com/v1/messages',
    model: 'claude-sonnet-4-6',
    authHeader: (key) => ({ 'x-api-key': key, 'anthropic-version': '2023-06-01' }),
  },
  glm: {
    url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    model: 'glm-4.7',
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
  },
}

interface AnalyzeRequest {
  provider: AIProvider
  apiKey: string
  config: InvestmentConfig
  snapshot: MarketSnapshot
}

// ─── OpenAI / GLM 兼容 SSE 解析 ──────────────────────────────
function* parseOpenAIChunks(lines: string[]): Generator<string> {
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('data: ')) continue
    const data = trimmed.slice(6)
    if (data === '[DONE]') continue
    try {
      const json = JSON.parse(data)
      const content: unknown = json?.choices?.[0]?.delta?.content
      if (typeof content === 'string' && content) yield content
    } catch {}
  }
}

// ─── Anthropic SSE 解析 ───────────────────────────────────────
// Anthropic 格式：event: content_block_delta\ndata: {"delta":{"type":"text_delta","text":"..."}}
function* parseAnthropicChunks(lines: string[]): Generator<string> {
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('data: ')) continue
    const data = trimmed.slice(6)
    try {
      const json = JSON.parse(data)
      if (json?.type === 'content_block_delta' && json?.delta?.type === 'text_delta') {
        const text: unknown = json.delta.text
        if (typeof text === 'string' && text) yield text
      }
    } catch {}
  }
}

export async function POST(req: Request) {
  let body: AnalyzeRequest
  try {
    body = await req.json()
  } catch {
    return new Response('请求体格式错误', { status: 400 })
  }

  const { provider = 'openai', apiKey, config, snapshot } = body
  if (!apiKey) {
    return new Response('缺少 API Key', { status: 400 })
  }

  const cfg = PROVIDER_CONFIG[provider]
  if (!cfg) {
    return new Response(`不支持的 provider: ${provider}`, { status: 400 })
  }

  const prompt = buildPrompt(config, snapshot)

  // ─── 构造各 provider 的请求 body ──────────────────────────
  const requestBody =
    provider === 'anthropic'
      ? JSON.stringify({
          model: cfg.model,
          max_tokens: 4096,
          stream: true,
          messages: [{ role: 'user', content: prompt }],
        })
      : JSON.stringify({
          model: cfg.model,
          messages: [{ role: 'user', content: prompt }],
          stream: true,
          temperature: 0.4,
        })

  let upstreamRes: Response
  try {
    upstreamRes = await fetch(cfg.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...cfg.authHeader(apiKey) },
      body: requestBody,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : '网络错误'
    return new Response(`连接 ${provider} API 失败: ${msg}`, { status: 502 })
  }

  if (!upstreamRes.ok) {
    const errText = await upstreamRes.text().catch(() => `HTTP ${upstreamRes.status}`)
    return new Response(`${provider} API 错误: ${errText}`, { status: 502 })
  }

  if (!upstreamRes.body) {
    return new Response(`${provider} API 未返回响应流`, { status: 502 })
  }

  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  const upstream = upstreamRes.body.getReader()
  const parseChunks = provider === 'anthropic' ? parseAnthropicChunks : parseOpenAIChunks

  const readableStream = new ReadableStream({
    async start(controller) {
      let buffer = ''
      try {
        while (true) {
          const { done, value } = await upstream.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const text of parseChunks(lines)) {
            controller.enqueue(encoder.encode(text))
          }
        }

        // 处理最后剩余的 buffer
        if (buffer.trim()) {
          for (const text of parseChunks([buffer])) {
            controller.enqueue(encoder.encode(text))
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : '未知错误'
        controller.enqueue(encoder.encode(`\n\n> ⚠️ 分析中断：${msg}`))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readableStream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
