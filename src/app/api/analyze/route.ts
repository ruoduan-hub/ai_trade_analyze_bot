/**
 * /api/analyze — 服务端 AI 分析路由
 *
 * 职责：
 *   1. 接收客户端传来的 { provider, apiKey, config, snapshot }
 *   2. 用 buildPrompt 组装投资分析 Prompt
 *   3. 通过 Function Calling / Tool Use 让 AI 输出两部分：
 *      - 文本：Markdown 格式分析报告（流式推送）
 *      - 工具调用：submit_orders 结构化订单（流结束后以 __ORDER_JSON__: 标记推送）
 */

import type { AIProvider, InvestmentConfig, MarketSnapshot } from '@/types'

// ─── 语言 → AI 输出语言指令映射 ─────────────────────────────────
const LOCALE_INSTRUCTION: Record<string, string> = {
  zh: '**请用中文撰写整份分析报告**（包括所有标题、正文、建议和 submit_orders 工具中的 reasoning 字段）。',
  en: '**Please write the entire analysis report in English** (including all headings, body text, recommendations, and the `reasoning` field in the submit_orders tool call).',
}
const DEFAULT_LOCALE_INSTRUCTION = LOCALE_INSTRUCTION['zh']

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

// ─── Tool 定义：Anthropic 格式 ────────────────────────────────────
const SUBMIT_ORDERS_TOOL_ANTHROPIC = {
  name: 'submit_orders',
  description: '分析报告完成后，调用此工具提交结构化 CCXT 订单数组。每个分析只调用一次，不得在报告正文中输出 JSON 代码块。',
  input_schema: {
    type: 'object' as const,
    properties: {
      orders: {
        type: 'array',
        description: '要提交的订单列表，只包含明确建议操作的币种',
        items: {
          type: 'object',
          properties: {
            symbol:    { type: 'string',              description: '交易对，如 "BTC/USDT"' },
            type:      { type: 'string', enum: ['limit', 'market'] },
            side:      { type: 'string', enum: ['buy', 'sell'] },
            amount:    { type: 'number',              description: '买卖数量（标的币单位，非 USDT）' },
            price:     { type: ['number', 'null'],    description: 'limit 单填建议入场价；market 单填 null' },
            reasoning: { type: 'string',              description: '一句话下单理由（技术/基本面依据）' },
            params: {
              type: 'object',
              properties: {
                stopLoss:   { type: 'number', description: '止损价（USDT），必填' },
                takeProfit: { type: 'number', description: '止盈价（USDT），必填' },
              },
              required: ['stopLoss', 'takeProfit'],
            },
          },
          required: ['symbol', 'type', 'side', 'amount'],
        },
      },
    },
    required: ['orders'],
  },
}

// ─── Tool 定义：OpenAI / GLM 兼容格式 ────────────────────────────
const SUBMIT_ORDERS_TOOL_OPENAI = {
  type: 'function' as const,
  function: {
    name: 'submit_orders',
    description: '分析报告完成后，调用此工具提交结构化 CCXT 订单数组。每个分析只调用一次，不得在报告正文中输出 JSON 代码块。',
    parameters: {
      type: 'object',
      properties: {
        orders: {
          type: 'array',
          description: '要提交的订单列表',
          items: {
            type: 'object',
            properties: {
              symbol:    { type: 'string' },
              type:      { type: 'string', enum: ['limit', 'market'] },
              side:      { type: 'string', enum: ['buy', 'sell'] },
              amount:    { type: 'number' },
              price:     { type: ['number', 'null'] },
              reasoning: { type: 'string' },
              params: {
                type: 'object',
                properties: {
                  stopLoss:   { type: 'number' },
                  takeProfit: { type: 'number' },
                },
                required: ['stopLoss', 'takeProfit'],
              },
            },
            required: ['symbol', 'type', 'side', 'amount'],
          },
        },
      },
      required: ['orders'],
    },
  },
}

// ─── 标记符：用于在流末尾分隔报告正文与订单 JSON ──────────────────
export const ORDER_JSON_MARKER = '\n__ORDER_JSON__:'

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

报告使用 Markdown 格式，简洁专业（具体语言见末尾"语言要求"章节）。**直接输出 Markdown 内容，不要使用代码围栏（\`\`\`markdown）包裹整份报告。**

---

## 输出要求

先输出完整的 Markdown 分析报告，**报告正文中不得包含任何 JSON 代码块**。

报告输出完毕后，调用 \`submit_orders\` 工具提交订单数组，填写规则如下：
- 只包含明确建议操作的币种，不操作的省略
- \`side\`：严格依据逐币分析中的买入/卖出建议填写
- \`type\`：有明确入场价用 \`limit\`；建议立即市价执行用 \`market\`
- \`price\`：limit 单填建议入场价；market 单设为 \`null\`
- \`amount\`：用 $${config.amount} USDT × 仓位比例 ÷ 入场价 计算（单位：标的币，非 USDT）
- \`params.stopLoss\` / \`params.takeProfit\`：必填，来自"关键价位"分析，不得与报告中的价位矛盾
- \`reasoning\`：一句话说明下单依据（技术/基本面）

---

## 语言要求

${LOCALE_INSTRUCTION[config.locale ?? ''] ?? DEFAULT_LOCALE_INSTRUCTION}`
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

  // ─── 构造各 provider 的请求 body（含工具定义） ─────────────
  const requestBody =
    provider === 'anthropic'
      ? JSON.stringify({
          model: cfg.model,
          max_tokens: 4096,
          stream: true,
          tools: [SUBMIT_ORDERS_TOOL_ANTHROPIC],
          tool_choice: { type: 'auto' },
          messages: [{ role: 'user', content: prompt }],
        })
      : JSON.stringify({
          model: cfg.model,
          messages: [{ role: 'user', content: prompt }],
          stream: true,
          temperature: 0.4,
          tools: [SUBMIT_ORDERS_TOOL_OPENAI],
          tool_choice: 'auto',
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

  const readableStream = new ReadableStream({
    async start(controller) {
      // 收集 Function Calling / Tool Use 的 JSON 参数
      let toolArgsBuffer = ''
      let buffer = ''

      const emitText = (text: string) => {
        controller.enqueue(encoder.encode(text))
      }

      // ── Anthropic SSE 解析（有状态，需处理 tool_use block） ──
      const processAnthropicLine = (line: string) => {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data: ')) return
        const data = trimmed.slice(6)
        try {
          const json = JSON.parse(data)
          if (json.type !== 'content_block_delta') return
          const delta = json.delta
          if (delta.type === 'text_delta' && typeof delta.text === 'string') {
            emitText(delta.text)
          } else if (delta.type === 'input_json_delta' && typeof delta.partial_json === 'string') {
            // tool_use block 的增量 JSON 参数
            toolArgsBuffer += delta.partial_json
          }
        } catch {}
      }

      // ── OpenAI / GLM SSE 解析（有状态，需处理 tool_calls delta） ──
      const processOpenAILine = (line: string) => {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data: ')) return
        const data = trimmed.slice(6)
        if (data === '[DONE]') return
        try {
          const json = JSON.parse(data)
          const delta = json?.choices?.[0]?.delta
          if (!delta) return
          // 文本内容
          if (typeof delta.content === 'string' && delta.content) {
            emitText(delta.content)
          }
          // 工具调用参数增量
          if (Array.isArray(delta.tool_calls)) {
            for (const tc of delta.tool_calls) {
              const args: unknown = tc?.function?.arguments
              if (typeof args === 'string') {
                toolArgsBuffer += args
              }
            }
          }
        } catch {}
      }

      const processLine = provider === 'anthropic' ? processAnthropicLine : processOpenAILine

      try {
        while (true) {
          const { done, value } = await upstream.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            processLine(line)
          }
        }

        // 处理最后剩余的 buffer
        if (buffer.trim()) {
          processLine(buffer)
        }

        // ── 流结束后：将工具调用结果作为特殊标记行追加 ──────────
        if (toolArgsBuffer.trim()) {
          try {
            const toolInput = JSON.parse(toolArgsBuffer) as { orders?: unknown }
            // Anthropic 的 input_schema 包装在 { orders: [...] } 里
            const orders = Array.isArray(toolInput)
              ? toolInput
              : (Array.isArray(toolInput.orders) ? toolInput.orders : [])
            emitText(`${ORDER_JSON_MARKER}${JSON.stringify(orders)}`)
          } catch {
            // 工具调用 JSON 解析失败：静默忽略，订单为空
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : '未知错误'
        emitText(`\n\n> ⚠️ 分析中断：${msg}`)
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
