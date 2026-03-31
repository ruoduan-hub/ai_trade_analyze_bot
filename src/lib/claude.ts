/**
 * src/lib/claude.ts — AI 分析客户端封装
 *
 * 职责：
 *   1. parseOrdersFromReport  — 从 AI 报告中提取 CCXT 订单 JSON
 *   2. analyzeWithStreaming    — 向 /api/analyze 发起请求，流式读取并回调
 *
 * 注意：Prompt 构建和 LangChain 调用均在服务端 /api/analyze 完成，
 *       此文件仅做浏览器侧的 HTTP 通信层。
 */

import type { AIProvider, InvestmentConfig, MarketSnapshot, CCXTOrder } from '@/types'

/**
 * 从 AI 报告的末尾 ```json ... ``` 代码块中解析 CCXT 订单数组。
 * 解析失败时静默返回空数组，不影响报告展示。
 */
export function parseOrdersFromReport(report: string): CCXTOrder[] {
  try {
    const jsonMatch = report.match(/```json\s*([\s\S]*?)\s*```/i)
    if (!jsonMatch) return []

    const parsed: unknown = JSON.parse(jsonMatch[1])
    if (!Array.isArray(parsed)) return []

    // 过滤必填字段不完整的条目
    return parsed.filter(
      (o) =>
        typeof o.symbol === 'string' &&
        typeof o.side === 'string' &&
        typeof o.amount === 'number',
    ) as CCXTOrder[]
  } catch {
    return []
  }
}

/**
 * 向服务端 /api/analyze 发起流式分析请求。
 *
 * @param apiKey     智谱 API Key（由用户在设置面板输入，存于 sessionStorage）
 * @param config     投资配置（币种、风格、周期、金额）
 * @param snapshot   实时市场数据快照
 * @param onChunk    每收到一段文本时的回调（用于实时渲染报告）
 * @param onComplete 全部文本接收完成后的回调（传入完整文本）
 * @param onError    请求或解析出错时的回调
 */
export async function analyzeWithStreaming(
  provider: AIProvider,
  apiKey: string,
  config: InvestmentConfig,
  snapshot: MarketSnapshot,
  onChunk: (text: string) => void,
  onComplete: (fullText: string) => void,
  onError: (error: Error) => void,
): Promise<void> {
  try {
    // ── 发起请求 ──
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

    // ── 逐块读取流式响应 ──
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let fullText = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      // stream: true 让 TextDecoder 正确处理多字节字符跨 chunk 的情况
      const chunk = decoder.decode(value, { stream: true })
      fullText += chunk
      onChunk(chunk)
    }

    // ── 刷新解码器剩余缓冲 ──
    const remaining = decoder.decode()
    if (remaining) {
      fullText += remaining
      onChunk(remaining)
    }

    onComplete(fullText)
  } catch (err) {
    onError(err instanceof Error ? err : new Error(String(err)))
  }
}
