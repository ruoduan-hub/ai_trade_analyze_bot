/**
 * src/lib/claude.ts — AI 分析客户端封装
 *
 * 职责：
 *   向 /api/analyze 发起请求，流式读取响应并分离：
 *   - content：Markdown 格式的分析报告正文
 *   - orders：来自 Function Calling 的结构化 CCXT 订单数组
 *
 * 协议：服务端在流末尾追加 "\n__ORDER_JSON__:[...]"，
 *       客户端按此标记分割 content 与 orders，确保报告展示时无 JSON 噪音。
 */

import type { AIProvider, InvestmentConfig, MarketSnapshot, CCXTOrder } from '@/types'

const ORDER_MARKER = '\n__ORDER_JSON__:'

/**
 * 向服务端 /api/analyze 发起流式分析请求。
 *
 * @param provider   AI 提供商
 * @param apiKey     AI API Key（存于 sessionStorage）
 * @param config     投资配置（币种、风格、周期、金额）
 * @param snapshot   实时市场数据快照
 * @param onChunk    每收到一段报告文本时的回调（不含 ORDER_JSON 标记行）
 * @param onComplete 全部接收完成后的回调，返回干净的 content 和解析好的 orders
 * @param onError    请求或解析出错时的回调
 */
export async function analyzeWithStreaming(
  provider: AIProvider,
  apiKey: string,
  config: InvestmentConfig,
  snapshot: MarketSnapshot,
  onChunk: (text: string) => void,
  onComplete: (content: string, orders: CCXTOrder[]) => void,
  onError: (error: Error) => void,
): Promise<void> {
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, apiKey, config, snapshot }),
    })

    if (!response.ok) {
      const msg = await response.text().catch(() => `HTTP ${response.status}`)
      throw new Error(msg)
    }

    if (!response.body) {
      throw new Error('服务端未返回响应流')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let fullText = ''
    let markerSeen = false

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })

      if (!markerSeen) {
        // 检查当前 chunk 加上已有内容是否包含 ORDER_JSON 标记
        const candidate = fullText + chunk
        const markerIdx = candidate.indexOf(ORDER_MARKER)

        if (markerIdx !== -1) {
          markerSeen = true
          // 只将标记之前的新增文本推送给 onChunk
          const beforeMarker = candidate.slice(fullText.length, markerIdx)
          if (beforeMarker) onChunk(beforeMarker)
        } else {
          onChunk(chunk)
        }
      }
      // 标记出现后的 chunk（纯 JSON 数据）不推送给 onChunk

      fullText += chunk
    }

    // 刷新解码器剩余缓冲
    const remaining = decoder.decode()
    if (remaining) {
      if (!markerSeen) {
        const candidate = fullText + remaining
        const markerIdx = candidate.indexOf(ORDER_MARKER)
        if (markerIdx !== -1) {
          const beforeMarker = candidate.slice(fullText.length, markerIdx)
          if (beforeMarker) onChunk(beforeMarker)
          markerSeen = true
        } else {
          onChunk(remaining)
        }
      }
      fullText += remaining
    }

    // ── 分离 content 与 orders ────────────────────────────────
    const markerIdx = fullText.indexOf(ORDER_MARKER)
    if (markerIdx !== -1) {
      const content = fullText.slice(0, markerIdx)
      const ordersJson = fullText.slice(markerIdx + ORDER_MARKER.length).trim()
      let orders: CCXTOrder[] = []
      try {
        const parsed: unknown = JSON.parse(ordersJson)
        if (Array.isArray(parsed)) {
          orders = parsed.filter(
            (o) =>
              typeof o.symbol === 'string' &&
              typeof o.side === 'string' &&
              typeof o.amount === 'number',
          ) as CCXTOrder[]
        }
      } catch {
        // JSON 解析失败：订单为空，报告正常展示
      }
      onComplete(content, orders)
    } else {
      // 未收到工具调用结果（不支持 Function Calling 的模型兜底）
      onComplete(fullText, [])
    }
  } catch (err) {
    onError(err instanceof Error ? err : new Error(String(err)))
  }
}
