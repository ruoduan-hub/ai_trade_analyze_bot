'use client'

import { useState } from 'react'
import { X, Key, Eye, EyeOff } from 'lucide-react'
import { Button } from './ui/Button'
import type { AIProvider } from '@/types'

interface Props {
  isOpen: boolean
  onClose: () => void
  provider: AIProvider
  apiKey: string
  onSave: (provider: AIProvider, key: string) => void
}

const PROVIDERS: { value: AIProvider; label: string; placeholder: string; hint: string }[] = [
  {
    value: 'openai',
    label: 'OpenAI',
    placeholder: 'sk-proj-...',
    hint: 'platform.openai.com/api-keys',
  },
  {
    value: 'anthropic',
    label: 'Anthropic',
    placeholder: 'sk-ant-...',
    hint: 'console.anthropic.com/settings/keys',
  },
  {
    value: 'glm',
    label: '智谱 GLM',
    placeholder: '请输入智谱 API Key',
    hint: 'open.bigmodel.cn/usercenter/apikeys',
  },
]

export function SettingsModal({ isOpen, onClose, provider, apiKey, onSave }: Props) {
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>(provider)
  const [input, setInput] = useState(apiKey)
  const [show, setShow] = useState(false)

  if (!isOpen) return null

  const current = PROVIDERS.find((p) => p.value === selectedProvider)!

  function handleProviderChange(p: AIProvider) {
    setSelectedProvider(p)
    setInput('')
  }

  function handleSave() {
    onSave(selectedProvider, input.trim())
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="设置"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm -z-10"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative bg-bg-base w-full max-w-sm rounded-2xl border border-themed shadow-2xl p-6 flex flex-col gap-5 animate-scale-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="size-4 text-accent" />
            <h2 className="text-sm font-heading font-bold text-foreground">API 设置</h2>
          </div>
          <button
            onClick={onClose}
            className="size-8 rounded-xl flex items-center justify-center hover:bg-surface text-muted hover:text-foreground transition-colors"
            aria-label="关闭"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Provider selector */}
        <div className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-widest text-muted font-mono">AI 提供商</span>
          <div className="flex gap-1 p-1 bg-surface rounded-xl">
            {PROVIDERS.map((p) => (
              <button
                key={p.value}
                onClick={() => handleProviderChange(p.value)}
                className={[
                  'flex-1 py-1.5 rounded-lg text-xs font-mono transition-colors',
                  selectedProvider === p.value
                    ? 'bg-accent text-white'
                    : 'text-muted hover:text-foreground',
                ].join(' ')}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* API Key input */}
        <div className="flex flex-col gap-2">
          <label className="text-xs uppercase tracking-widest text-muted font-mono">
            {current.label} API Key
          </label>
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={current.placeholder}
              className="w-full px-4 py-2.5 pr-10 rounded-xl bg-surface border border-themed text-sm font-mono text-foreground placeholder:text-muted focus:outline-none focus:border-accent/50 transition-colors"
              autoComplete="off"
            />
            <button
              onClick={() => setShow((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
              aria-label={show ? '隐藏 Key' : '显示 Key'}
            >
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <p className="text-[10px] text-muted font-mono leading-relaxed">
            API Key 仅保存在当前浏览器 sessionStorage，关闭标签即清除。
            <br />
            获取地址：{current.hint}
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" size="md" className="flex-1" onClick={onClose}>
            取消
          </Button>
          <Button
            variant="primary"
            size="md"
            className="flex-1"
            disabled={!input.trim()}
            onClick={handleSave}
          >
            保存
          </Button>
        </div>
      </div>
    </div>
  )
}
