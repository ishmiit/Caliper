import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { api } from './api'
import TopBar from './components/TopBar'
import EngineLog from './components/EngineLog'
import Leaderboard from './components/Leaderboard'
import Receipt from './components/Receipt'
import Requirements from './components/Requirements'
import Audit from './components/Audit'
import Evaluate from './components/Evaluate'
import Chat from './components/Chat'
import Upload from './components/Upload'
import { Ambient, view } from './components/fx'

export default function App() {
  const [graph, setGraph] = useState(null)
  const [config, setConfig] = useState({ keyword_on: true, semantic_on: true })
  const [selected, setSelected] = useState(null)
  const [compareWith, setCompareWith] = useState(null)
  const [focusReq, setFocusReq] = useState(null)
  const [currentView, setView] = useState('board')
  const [running, setRunning] = useState(false)
  const [log, setLog] = useState(null)
  const [flags, setFlags] = useState(null)
  const [banner, setBanner] = useState(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [jumpLine, setJumpLine] = useState(null)
  const [theme, setThemeState] = useState(() => { try { return localStorage.getItem('caliper-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') } catch { return 'dark' } })
  const setTheme = (t) => { setThemeState(t); try { localStorage.setItem('caliper-theme', t) } catch {} }
  useEffect(() => { document.documentElement.setAttribute('data-theme', theme) }, [theme])
  const prevRanks = useRef({})

  const applyGraph = useCallback((g) => {
    if (graph) {
      const prev = {}
      for (const c of graph.candidates) prev[c.candidate_id] = c.rank
      prevRanks.current = prev
    }
    setGraph(g)
  }, [graph])

  const run = useCallback(async (uploader) => {
    setRunning(true); setLog(null); setSelected(null); setFlags(null)
    try {
      const g = uploader ? await uploader() : await api.run()
      setLog(g.log)
      await new Promise((r) => setTimeout(r, Math.min(2600, 260 * g.log.length + 500)))
      prevRanks.current = {}
      setGraph(g)
      setConfig({ ...config, keyword_on: true, semantic_on: true })
    } finally { setRunning(false) }
  }, [config])

  const rerank = useCallback(async (next) => {
    const merged = { ...config, ...next }
    setConfig(merged)
    const g = await api.rank(merged)
    applyGraph(g)
  }, [config, applyGraph])

  useEffect(() => { run() }, []) // eslint-disable-line

  const candidates = graph?.candidates ?? []
  const selectedCand = useMemo(() => candidates.find((c) => c.candidate_id === selected), [candidates, selected])
  const compareCand = useMemo(() => candidates.find((c) => c.candidate_id === compareWith), [candidates, compareWith])

  const onSelect = (cid) => {
    if (compareWith === null && selected && selected !== cid && currentView === 'board' && window.event?.shiftKey) { setCompareWith(cid); return }
    setSelected(cid === selected ? null : cid); setCompareWith(null); setJumpLine(null)
  }

  const openCompare = (a, b) => { setSelected(a); setCompareWith(b); setView('board') }
  const citeJump = (cid, line) => { setSelected(cid); setCompareWith(null); setView('board'); setJumpLine(line ?? null) }

  const onApplyFix = async (flag) => {
    const g = await api.applyFix(flag.id)
    applyGraph(g)
    const moved = flag.counterfactual?.movers?.length ?? 0
    const rej = flag.hard_filter?.rejects ?? 0
    setBanner({ text: moved ? `"${flag.phrase}" was holding back ${moved} of your ${g.candidates.length} candidates — board re-ranked.` : rej ? `"${flag.phrase}" removed. A hard filter on it would have rejected ${rej} of ${g.candidates.length}.` : `"${flag.phrase}" removed — no rank changes in this pool.`, tone: moved || rej ? 'amber' : 'slate' })
    setTimeout(() => setBanner(null), 6000)
    setFlags(null)
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <Ambient />
      <TopBar graph={graph} config={config} onToggle={rerank} view={currentView} setView={setView} onRun={() => run()} onUpload={() => setUploadOpen(true)} running={running} theme={theme} setTheme={setTheme} />
      <AnimatePresence>
        {banner && (
          <motion.div initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -40, opacity: 0 }} className={`mx-5 mb-1 rounded-2xl px-5 py-3 text-[13px] font-medium flex items-center gap-3 card ${banner.tone === 'amber' ? 'text-stated' : 'text-ink-2'}`}>
            <span className="gem w-6 h-6 rounded-full grid place-items-center text-[12px]">⚡</span><span className="text-ink">{banner.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex-1 min-h-0 relative">
        <AnimatePresence>{running && <EngineLog log={log} />}</AnimatePresence>
        <AnimatePresence mode="wait">
        {graph && currentView === 'board' && (
          <motion.div key="board" {...view} className="h-full grid grid-cols-[290px_minmax(0,1fr)_minmax(0,520px)] gap-4 px-5 pb-5 pt-1">
            <Requirements graph={graph} focusReq={focusReq} setFocusReq={setFocusReq} />
            <Leaderboard graph={graph} selected={selected} compareWith={compareWith} onSelect={onSelect} prevRanks={prevRanks.current} focusReq={focusReq} />
            <AnimatePresence mode="wait">
              {selectedCand ? (
                <Receipt key={selected + (compareWith || '')} cand={selectedCand} compare={compareCand} graph={graph} onClose={() => { setSelected(null); setCompareWith(null) }} onCompare={(b) => setCompareWith(b)} jumpLine={jumpLine} focusReq={focusReq} setFocusReq={setFocusReq} />
              ) : (
                <EmptyReceipt key="empty" graph={graph} onPick={(cid) => setSelected(cid)} />
              )}
            </AnimatePresence>
          </motion.div>
        )}
        {graph && currentView === 'audit' && <motion.div key="audit" {...view} className="h-full"><Audit graph={graph} flags={flags} setFlags={setFlags} onApply={onApplyFix} prevRanks={prevRanks.current} onSelect={(cid) => { setSelected(cid); setView('board') }} /></motion.div>}
        {graph && currentView === 'evaluate' && <motion.div key="evaluate" {...view} className="h-full"><Evaluate graph={graph} config={config} onConfig={rerank} onSelect={(cid) => { setSelected(cid); setView('board') }} /></motion.div>}
        </AnimatePresence>
      </div>
      {graph && <Chat graph={graph} onCompare={openCompare} onCite={citeJump} />}
      <AnimatePresence>{uploadOpen && <Upload onClose={() => setUploadOpen(false)} onRun={(uploader) => { setUploadOpen(false); run(uploader) }} defaultJD={graph?.jd_text} />}</AnimatePresence>
    </div>
  )
}

function EmptyReceipt({ graph, onPick }) {
  const top = graph.candidates.slice(0, 3)
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="card p-6 flex flex-col gap-4 overflow-auto">
      <div>
        <div className="text-[17px] font-semibold tight">Top 3, explained</div>
        <div className="text-[12px] text-ink-3 mt-0.5">Rendered from the evidence graph. Every claim cites a requirement and a resume line.</div>
      </div>
      {top.map((c) => (
        <button key={c.candidate_id} onClick={() => onPick(c.candidate_id)} className="text-left rounded-2xl bg-surface-2 p-5 hover:bg-accent/8 transition-colors">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-[15px] tight"><span className="text-ink-3 mr-2">#{c.rank}</span>{c.name}</div>
            <div className="num text-[18px] font-semibold tight">{c.final_score}</div>
          </div>
          <div className="mt-2 text-[12.5px] leading-relaxed text-ink-2">{c.explanation.summary}</div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {c.explanation.strengths.slice(0, 4).map((s) => <span key={s.req_id} className={`pill pill-${s.verdict}`}>{s.req_id} · {s.label}</span>)}
            {c.explanation.gaps.slice(0, 3).map((g) => <span key={g.req_id} className="pill pill-MISSING">{g.req_id} · {g.label}</span>)}
          </div>
        </button>
      ))}
      <div className="text-[11.5px] text-ink-3 mt-auto">Click any row for its full receipt · shift-click a second row to compare</div>
    </motion.div>
  )
}
