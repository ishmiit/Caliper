import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useTyped } from './fx'

export default function EngineLog({ log }) {
  const [elapsed, setElapsed] = useState(0)
  const [shown, setShown] = useState(0)
  useEffect(() => {
    const t0 = performance.now()
    const id = setInterval(() => setElapsed(Math.round(performance.now() - t0)), 37)
    return () => clearInterval(id)
  }, [])
  useEffect(() => {
    if (!log) return
    setShown(0)
    let i = 0
    const id = setInterval(() => { i += 1; setShown(i); if (i >= log.length) clearInterval(id) }, 240)
    return () => clearInterval(id)
  }, [log])

  const pad = (s, n = 42) => s.length >= n ? s : s + ' ' + '.'.repeat(Math.max(1, n - s.length - 1))
  const lines = (log || []).slice(0, shown)
  const totals = { chunks: lines.find((l) => l.chunks)?.chunks, pairs: lines.find((l) => l.pairs)?.pairs, vocab: lines.find((l) => l.vocab)?.vocab }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.35 } }} className="absolute inset-0 z-30 bg-canvas/85 backdrop-blur-sm grid place-items-center">
      <motion.div initial={{ scale: 0.97, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 1.02, opacity: 0 }} className="w-[640px] card card-solid overflow-hidden" style={{ boxShadow: 'var(--shadow-lg)' }}>
        <div className="absolute left-0 right-0 top-0 h-[2px] overflow-hidden"><motion.div className="h-full w-1/3 score-bar" animate={{ x: ['-100%', '400%'] }} transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }} /></div>
        <div className="px-6 py-4 border-b border-line-2 flex items-center gap-3">
          <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-60" /><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent" /></span>
          <div className="font-semibold tight text-[15px]">Engine running</div>
          <div className="ml-auto num text-[12px] text-ink-2">{(elapsed / 1000).toFixed(2)}s</div>
        </div>
        <div className="px-6 py-5 font-mono text-[12.5px] leading-7 min-h-[260px]">
          {!log && <Booting />}
          {lines.map((l, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className={`flex ${l.step === 'Done' ? 'text-ink font-semibold mt-1' : 'text-ink-2'}`}>
              <span className="whitespace-pre">{pad(l.step)}</span>
              <span className="ml-auto num text-ink-3">{l.ms.toLocaleString()} ms</span>
              <span className="ml-3 text-confirmed">✓</span>
            </motion.div>
          ))}
        </div>
        <div className="px-6 py-4 bg-surface-2 border-t border-line-2 grid grid-cols-4 gap-3">
          <Counter label="chunks" value={totals.chunks} />
          <Counter label="vocab" value={totals.vocab} />
          <Counter label="pairs scored" value={totals.pairs} />
          <Counter label="embedding" value="384-d · local" raw />
        </div>
      </motion.div>
    </motion.div>
  )
}

function Booting() {
  const t = useTyped('pdfplumber → PyMuPDF fallback\nfuzzy section headers · rapidfuzz ≥ 80\natomic evidence chunks · section-weighted\nhand-written BM25 · k1 1.5 · b 0.75\nMiniLM-L6 · 384-d · local · late interaction', 9)
  return <div className="text-ink-3 whitespace-pre-wrap">{t}<span className="caret">▍</span></div>
}

function Counter({ label, value, raw }) {
  return (
    <div>
      <div className="eyebrow">{label}</div>
      <motion.div key={String(value)} initial={{ opacity: 0.3 }} animate={{ opacity: 1 }} className="num text-[14px] font-semibold text-ink">{value === undefined ? '—' : raw ? value : Number(value).toLocaleString()}</motion.div>
    </div>
  )
}
