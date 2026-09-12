import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, Send, X } from 'lucide-react'
import { api } from '../api'

const SUGGEST = ['Why is #1 above #2?', 'Show hidden gems', 'Who is missing Docker?', 'Who has React?']

export default function Chat({ graph, onCompare, onCite }) {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState([{ role: 'bot', text: 'Ask me about the ranking. I answer from the evidence graph only — every claim cites a requirement and a resume line.', citations: [] }])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const endRef = useRef(null)
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, open])

  const nameOf = (cid) => graph.candidates.find((c) => c.candidate_id === cid)?.name?.split(' ')[0] || cid

  const send = async (text) => {
    const q = (text ?? input).trim()
    if (!q) return
    setInput(''); setBusy(true)
    setMsgs((m) => [...m, { role: 'user', text: q }])
    try {
      const r = await api.chat(q)
      setMsgs((m) => [...m, { role: 'bot', text: r.text, citations: r.citations || [], compare: r.compare }])
      if (r.compare) onCompare(r.compare[0], r.compare[1])
    } finally { setBusy(false) }
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.98 }} transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            className="fixed bottom-20 right-5 w-[400px] h-[480px] card flex flex-col overflow-hidden z-40" style={{ boxShadow: 'var(--shadow-lg)' }}>
            <div className="px-5 py-3.5 border-b border-line-2 flex items-center gap-2">
              <span className="font-semibold tight text-[14px]">Ask the graph</span>
              <span className="text-[11px] text-ink-3 ml-1">structured · no RAG</span>
              <button onClick={() => setOpen(false)} className="ml-auto p-1 rounded hover:bg-surface-3 text-ink-3"><X size={14} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {msgs.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[88%] rounded-2xl px-3.5 py-2 text-[12.5px] leading-relaxed ${m.role === 'user' ? 'bg-ink text-canvas rounded-br-sm' : 'bg-surface-3 text-ink rounded-bl-sm'}`}>
                    {m.text}
                    {m.citations?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {m.citations.map((c, k) => (
                          <button key={k} onClick={() => c.candidate_id && onCite(c.candidate_id, c.line)} className="num text-[10.5px] rounded bg-surface-2 border border-line px-1.5 py-0.5 hover:border-accent hover:text-accent">
                            {c.candidate_id ? nameOf(c.candidate_id) : ''}{c.req_id ? ` ${c.req_id}` : ''}{c.line !== null && c.line !== undefined ? ` L${c.line + 1}` : ''}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {busy && <div className="text-ink-3 text-[12px] animate-pulse">thinking…</div>}
              <div ref={endRef} />
            </div>
            <div className="px-3 pb-2 flex flex-wrap gap-1">{SUGGEST.map((s) => <button key={s} onClick={() => send(s)} className="text-[11px] rounded-full border border-line px-2 py-0.5 text-ink-2 hover:bg-surface-2">{s}</button>)}</div>
            <form onSubmit={(e) => { e.preventDefault(); send() }} className="p-3 border-t border-line flex gap-2">
              <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Why is Priya above Arjun?" className="flex-1 rounded-full bg-surface-2 px-4 py-2 text-[12.5px] focus:outline-none focus:ring-2 focus:ring-accent/40" />
              <button className="btn btn-primary !px-3" disabled={busy}><Send size={13} /></button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
      <button onClick={() => setOpen((o) => !o)} className="fixed bottom-5 right-5 z-40 h-11 px-4 rounded-full bg-ink text-canvas flex items-center gap-2 font-semibold text-[13px] hover:opacity-90 transition-opacity" style={{ boxShadow: 'var(--shadow-lg)' }}>
        <MessageSquare size={16} /> Ask the graph
      </button>
    </>
  )
}
