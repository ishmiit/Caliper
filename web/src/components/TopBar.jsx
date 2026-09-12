import { motion } from 'framer-motion'
import { Play, Upload, Sun, Moon } from 'lucide-react'

function Switch({ label, on, onChange, color }) {
  return (
    <button onClick={() => onChange(!on)} className="group flex items-center gap-2 rounded-full pl-1 pr-3 py-1 hover:bg-surface-2 transition-colors">
      <span className="relative w-8 h-[18px] rounded-full transition-colors" style={{ background: on ? color : 'var(--surface-3)' }}>
        <span className="absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-[left] duration-200 ease-out" style={{ left: on ? 16 : 2 }} />
      </span>
      <span className={`text-[12px] font-semibold transition-colors ${on ? 'text-ink' : 'text-ink-3'}`}>{label}</span>
    </button>
  )
}

export default function TopBar({ graph, config, onToggle, view, setView, onRun, onUpload, running, theme, setTheme }) {
  const m = graph?.metrics
  const tabs = [['board', 'Board'], ['audit', 'JD Audit'], ['evaluate', 'Evaluate']]
  return (
    <div className="h-[60px] shrink-0 flex items-center px-5 gap-5">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-[9px] grid place-items-center" style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M3 12V4M3 12h10M6 12V7M9 12V5M12 12V8" stroke="white" strokeWidth="1.8" strokeLinecap="round" /></svg>
        </div>
        <div className="font-semibold tracking-[-0.02em] text-[15px]">Caliper</div>
      </div>

      <div className="flex items-center gap-0.5 bg-surface-2 rounded-full p-[3px]">
        {tabs.map(([k, label]) => (
          <button key={k} onClick={() => setView(k)} className={`relative px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold transition-colors ${view === k ? 'text-ink' : 'text-ink-2 hover:text-ink'}`}>
            {view === k && <motion.span layoutId="tab" className="absolute inset-0 rounded-full bg-surface-solid shadow-sm" transition={{ type: 'spring', stiffness: 420, damping: 32 }} />}
            <span className="relative">{label}</span>
          </button>
        ))}
      </div>

      {graph && (
        <div className="hidden xl:flex items-center gap-2 text-[12px] text-ink-2 min-w-0">
          <span className="truncate max-w-[240px]">{graph.jd_title}</span>
          <span className="text-ink-3">·</span>
          <span className="num whitespace-nowrap">{graph.candidates.length} resumes</span>
        </div>
      )}

      <div className="ml-auto flex items-center gap-2">
        <div className="flex items-center rounded-full bg-surface-2 p-[3px]">
          <Switch label="Keyword" on={config.keyword_on} onChange={(v) => onToggle({ keyword_on: v })} color="var(--stated)" />
          <Switch label="Semantic" on={config.semantic_on} onChange={(v) => onToggle({ semantic_on: v })} color="var(--inferred)" />
        </div>
        <div className="flex items-center gap-4 px-4 h-[34px] rounded-full bg-surface-2">
          <Metric label="nDCG@5" value={m?.ndcg5} />
          <Metric label="ρ" value={m?.spearman} />
          <Metric label="spread" value={graph ? (graph.candidates[0].final_score - graph.candidates.at(-1).final_score).toFixed(0) : null} raw />
        </div>
        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="w-[34px] h-[34px] rounded-full bg-surface-2 hover:bg-surface-3 grid place-items-center text-ink-2 hover:text-ink transition-colors" title="Toggle theme">
          <motion.span key={theme} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} className="grid place-items-center">{theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}</motion.span>
        </button>
        <button className="w-[34px] h-[34px] rounded-full bg-surface-2 hover:bg-surface-3 grid place-items-center text-ink-2 hover:text-ink transition-colors" onClick={onUpload} title="Upload JD + resumes"><Upload size={15} /></button>
        <button className="btn btn-primary" onClick={onRun} disabled={running}><Play size={12} fill="currentColor" /> Run</button>
      </div>
    </div>
  )
}

function Metric({ label, value, raw }) {
  const has = value !== null && value !== undefined
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[10.5px] font-semibold tracking-wide text-ink-3 whitespace-nowrap">{label}</span>
      <motion.span key={String(value)} initial={{ opacity: 0.3, y: 3 }} animate={{ opacity: 1, y: 0 }} className={`num text-[13px] font-semibold ${has ? 'text-ink' : 'text-ink-3'}`}>
        {has ? (raw ? value : Number(value).toFixed(2)) : '—'}
      </motion.span>
    </div>
  )
}
