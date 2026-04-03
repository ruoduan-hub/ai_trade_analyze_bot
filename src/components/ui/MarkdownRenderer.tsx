'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import type { Components } from 'react-markdown'

/** 代码块渲染：区分行内代码和块级代码 */
function CodeBlock({
  children,
  className,
}: {
  children?: React.ReactNode
  className?: string
}) {
  const isBlock = className?.startsWith('language-')
  if (isBlock) {
    return (
      <code className={`${className ?? ''} block text-[10px] font-mono leading-relaxed`}>
        {children}
      </code>
    )
  }
  return (
    <code className="text-[10px] font-mono text-accent bg-accent/10 border border-accent/15 rounded px-1.5 py-0.5">
      {children}
    </code>
  )
}

/** 完整版 Markdown 组件映射（用于 AnalysisReport） */
export const fullComponents: Components = {
  h1: ({ children }) => (
    <h1 className="text-base font-heading font-bold text-foreground mt-6 mb-3 first:mt-0 flex items-center gap-2">
      <span className="inline-block w-1 h-4 bg-accent rounded-full flex-shrink-0" />
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-sm font-heading font-bold text-foreground/90 mt-5 mb-2.5 pb-1.5 border-b border-themed-dim flex items-center gap-2">
      <span className="inline-block w-0.5 h-3.5 bg-accent/60 rounded-full flex-shrink-0" />
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-xs font-mono font-semibold text-accent mt-4 mb-2 uppercase tracking-widest">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="text-xs font-mono text-foreground/80 leading-relaxed mb-2.5">{children}</p>
  ),
  ul: ({ children }) => <ul className="list-none space-y-1.5 mb-3 pl-1">{children}</ul>,
  ol: ({ children }) => (
    <ol className="list-none space-y-1.5 mb-3 pl-1 counter-reset-[item]">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="flex items-start gap-2 text-xs font-mono text-foreground/80 leading-relaxed">
      <span className="text-accent mt-0.5 flex-shrink-0 text-sm leading-none">›</span>
      <span>{children}</span>
    </li>
  ),
  strong: ({ children }) => (
    <strong className="text-foreground font-semibold">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="text-warning/90 not-italic font-medium">{children}</em>
  ),
  code: CodeBlock,
  pre: ({ children }) => (
    <pre className="my-3 overflow-x-auto rounded-lg border border-themed text-[10px] p-3 leading-relaxed">
      {children}
    </pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-accent/50 pl-3 my-3 bg-accent/5 rounded-r-lg py-2 pr-2">
      <div className="text-xs text-foreground/70 font-mono italic leading-relaxed">{children}</div>
    </blockquote>
  ),
  hr: () => (
    <div className="my-4 flex items-center gap-3">
      <div className="flex-1 h-px bg-border-dim" />
      <span className="text-accent/30 text-[8px]">◆</span>
      <div className="flex-1 h-px bg-border-dim" />
    </div>
  ),
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto rounded-lg border border-themed">
      <table className="w-full text-[10px] font-mono border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-accent/10 text-accent uppercase tracking-wider">{children}</thead>
  ),
  tbody: ({ children }) => (
    <tbody className="divide-y divide-themed-dim">{children}</tbody>
  ),
  tr: ({ children }) => (
    <tr className="hover:bg-surface transition-colors duration-150">{children}</tr>
  ),
  th: ({ children }) => <th className="px-3 py-2 text-left font-semibold">{children}</th>,
  td: ({ children }) => <td className="px-3 py-2 text-foreground/75">{children}</td>,
}

/** 精简版 Markdown 组件映射（用于历史记录详情面板） */
export const compactComponents: Components = {
  h2: ({ children }) => (
    <h2 className="text-sm font-heading font-bold text-foreground mt-4 mb-2 flex items-center gap-2">
      <span className="inline-block w-0.5 h-3.5 bg-accent/60 rounded-full flex-shrink-0" />
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-xs font-mono font-semibold text-accent mt-3 mb-1 uppercase tracking-widest">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="text-xs font-mono text-foreground/80 leading-relaxed mb-2">{children}</p>
  ),
  ul: ({ children }) => <ul className="list-none space-y-1 mb-3">{children}</ul>,
  li: ({ children }) => (
    <li className="flex items-start gap-2 text-xs font-mono text-foreground/70 mb-1">
      <span className="text-accent mt-0.5 flex-shrink-0">›</span>
      <span>{children}</span>
    </li>
  ),
  strong: ({ children }) => (
    <strong className="text-foreground font-semibold">{children}</strong>
  ),
  code: CodeBlock,
  pre: ({ children }) => (
    <pre className="my-3 overflow-x-auto rounded-lg border border-themed text-[10px] p-3 leading-relaxed">
      {children}
    </pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-accent/50 pl-3 my-3 bg-accent/5 rounded-r-lg py-2 pr-2">
      <div className="text-xs text-foreground/70 font-mono italic leading-relaxed">{children}</div>
    </blockquote>
  ),
  hr: () => <hr className="border-themed-dim my-4" />,
}

interface MarkdownRendererProps {
  /** Markdown 文本内容 */
  content: string
  /** 使用完整版还是精简版样式，默认 full */
  variant?: 'full' | 'compact'
  className?: string
}

/**
 * 去除 AI 有时将整份报告包裹在代码围栏中的情况，例如：
 *   ```markdown
 *   # 标题
 *   ...
 *   ```
 * 只处理最外层的围栏，内部代码块保持不变。
 */
function stripOuterCodeFence(text: string): string {
  const trimmed = text.trim()
  const match = trimmed.match(/^```(?:markdown|md)?\n([\s\S]*?)\n```$/i)
  return match ? match[1] : text
}

/**
 * 统一的 Markdown 渲染组件
 * - full: 用于 AnalysisReport，包含完整的标题/表格/代码高亮样式
 * - compact: 用于 HistoryPanel 详情面板，精简版样式
 */
export function MarkdownRenderer({
  content,
  variant = 'full',
  className,
}: MarkdownRendererProps) {
  const components = variant === 'full' ? fullComponents : compactComponents
  const plugins = variant === 'full' ? [rehypeHighlight] : []
  const processedContent = stripOuterCodeFence(content)

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={plugins}
        components={components}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  )
}
