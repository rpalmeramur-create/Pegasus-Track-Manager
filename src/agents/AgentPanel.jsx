import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { X, Send, Zap, Loader } from 'lucide-react'
import { AGENT_CONFIGS, DEFAULT_AGENT_CONFIG } from './configs'

// Build a thin api shim for context loaders (mirrors the Meets.jsx proxy pattern)
const ctxApi = new Proxy({}, {
  get(_, key) { return window.electronAPI?.[key] }
})

function TypingDots() {
  return (
    <div className="agent-msg agent-msg-assistant" style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '10px 14px' }}>
      <span className="agent-dot" /><span className="agent-dot" style={{ animationDelay: '0.2s' }} /><span className="agent-dot" style={{ animationDelay: '0.4s' }} />
    </div>
  )
}

export default function AgentPanel() {
  const location  = useLocation()
  const [open,    setOpen]    = useState(false)
  const [msgs,    setMsgs]    = useState([])
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const [ctxReady, setCtxReady] = useState(false)
  const [ctxText,  setCtxText]  = useState('')
  const [hasKey,   setHasKey]   = useState(null)   // null = unknown, true/false
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  const config = AGENT_CONFIGS[location.pathname] ?? DEFAULT_AGENT_CONFIG

  // Reset conversation when navigating to a different page
  useEffect(() => {
    setMsgs([])
    setCtxReady(false)
    setCtxText('')
  }, [location.pathname])

  // Load context + check for API key when panel opens
  useEffect(() => {
    if (!open) return
    setCtxReady(false)

    // Check API key existence
    window.electronAPI?.getSettings?.().then(s => {
      setHasKey(!!s?.hasClaudeKey)
    }).catch(() => setHasKey(false))

    // Load page-specific context
    config.getContext(ctxApi).then(text => {
      setCtxText(text || '')
      setCtxReady(true)
    }).catch(() => { setCtxText(''); setCtxReady(true) })
  }, [open, location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, loading])

  // Focus input when panel opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  const systemPrompt = [config.systemPrompt, ctxText ? `\nCurrent context:\n${ctxText}` : ''].join('')

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    const next = [...msgs, { role: 'user', content: text }]
    setMsgs(next)
    setLoading(true)

    if (!window.electronAPI?.aiChat) {
      setMsgs(m => [...m, { role: 'assistant', content: 'AI chat is only available in the desktop app.' }])
      setLoading(false)
      return
    }

    const res = await window.electronAPI.aiChat({ messages: next, systemPrompt })
    if (res?.error === 'no_key') {
      setMsgs(m => [...m, { role: 'assistant', content: '⚙️ No Claude API key found. Add it in **Settings → AI Assistant**.' }])
      setHasKey(false)
    } else if (res?.error) {
      setMsgs(m => [...m, { role: 'assistant', content: `Error: ${res.error}` }])
    } else {
      const reply = res?.content?.[0]?.text ?? '(empty response)'
      setMsgs(m => [...m, { role: 'assistant', content: reply }])
      if (hasKey === null) setHasKey(true)
    }
    setLoading(false)
  }, [input, loading, msgs, systemPrompt, hasKey])

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  if (!open) {
    return (
      <button className="agent-trigger" onClick={() => setOpen(true)} title={config.intro}>
        <Zap size={13} strokeWidth={2.5} />
        <span>Ask {config.name}</span>
      </button>
    )
  }

  return (
    <div className="agent-panel">
      {/* Header */}
      <div className="agent-header">
        <span className="agent-icon">{config.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, letterSpacing: '0.05em' }}>
            {config.name.toUpperCase()} ASSISTANT
          </div>
          {!ctxReady && (
            <div style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Loader size={9} className="agent-spin" /> Loading context…
            </div>
          )}
        </div>
        <button className="btn btn-ghost btn-icon" style={{ padding: 4 }} onClick={() => setOpen(false)}>
          <X size={14} />
        </button>
      </div>

      {/* No-key warning */}
      {hasKey === false && (
        <div style={{ padding: '8px 14px', fontSize: 11, background: 'rgba(245,158,11,0.08)',
          borderBottom: '1px solid rgba(245,158,11,0.2)', color: 'var(--gold)' }}>
          Add your Claude API key in <strong>Settings → AI Assistant</strong> to enable chat.
        </div>
      )}

      {/* Messages */}
      <div className="agent-messages">
        {msgs.length === 0 && ctxReady && (
          <div className="agent-empty">
            <span style={{ fontSize: 24 }}>{config.icon}</span>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.5 }}>
              {config.intro}
            </p>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`agent-msg agent-msg-${m.role}`}>
            {m.content}
          </div>
        ))}
        {loading && <TypingDots />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="agent-footer">
        <textarea
          ref={inputRef}
          className="input agent-input"
          rows={1}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask a question…"
          style={{ resize: 'none', flex: 1, fontSize: 13, padding: '8px 12px', minHeight: 36 }}
        />
        <button className="btn btn-primary" style={{ padding: '8px 12px', flexShrink: 0 }}
          onClick={send} disabled={!input.trim() || loading} title="Send (Enter)">
          <Send size={14} />
        </button>
      </div>
    </div>
  )
}
