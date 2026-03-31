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

### 市场情绪
${fgSection}
${defiSection}

### 最新资讯
${newsSection}

---

## 分析要求

请基于以上数据，提供专业的投资分析报告，报告需包含：

1. **市场综合评估** — 整体牛熊判断，当前市场阶段
2. **逐币分析** — 对每个标的进行技术面+基本面分析，给出明确的 买入/卖出/持有 建议
3. **风险评估** — 结合用户的投资风格，说明主要风险点
4. **仓位建议** — 根据投资金额（$${config.amount} USDT），给出各币种的建议仓位比例
5. **关键价位** — 建议的入场价、止损价（Stop Loss）、止盈价（Take Profit）

报告用中文撰写，使用 Markdown 格式，简洁专业。

---

## 输出格式要求

先输出分析报告的正文 Markdown，然后**在报告末尾**输出一个 JSON 代码块，包含可直接用于 CCXT 下单的订单数组。

JSON 格式如下（不允许有多余字段，reasoning 字段可选）：

\`\`\`json
[
  {
    "symbol": "BTC/USDT",
    "type": "limit",
    "side": "buy",
    "amount": 0.001,
    "price": 65000,
    "reasoning": "技术面底部支撑明显，MACD金叉信号",
    "params": {
      "stopLoss": 62000,
      "takeProfit": 72000
    }
  }
]
\`\`\`

如果建议不操作某个标的，在 JSON 中省略该币种。
如果建议卖出，将 "side" 设为 "sell"。
所有金额/价格单位为 USDT。`
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
