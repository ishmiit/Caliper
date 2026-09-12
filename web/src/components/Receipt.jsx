import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { X, Zap, GitCompare, FileText, ListChecks } from 'lucide-react'
import { api, VERDICT_LABEL, VERDICT_HINT } from '../api'
import FusionMap from './FusionMap'
import { CountUp } from './fx'

const spring = { type: 'spring', stiffness: 380, damping: 32 }

export default function Receipt({ cand, compare, graph, onClose, onCompare, jumpLine, focusReq, setFocusReq }) {
  const [resume, setResume] = useState(null)
  const [hlLine, setHlLine] = useState(jumpLine ?? null)
  const [tab, setTab] = useState('receipt')
  const [cmp, setCmp] = useState(null)
  const reqById = useMemo(() => Object.fromEntries(graph.requirements.map((r) => [r.req_id, r])), [graph])

  useEffect(() => { api.resume(cand.candidate_id).then(setResume) }, [cand.candidate_id])
  useEffect(() => { if (jumpLine !== null && jumpLine !== undefined) { setHlLine(jumpLine); setTab('resume') } }, [jumpLine])
  useEffect(() => { if (compare) api.compare(cand.candidate_id, compare.candidate_id).then(setCmp); else setCmp(null) }, [cand.candidate_id, compare?.candidate_id])

  const rows = [...cand.per_requirement].sort((a, b) => b.contribution - a.contribution)
  const evLines = new Set(cand.per_requirement.flatMap((p) => p.evidence.map((e) => e.line)))

  return (
    <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }} transition={spring} className="card flex flex-col min-h-0 overflow-hidden">
      <div className="px-6 pt-5 pb-3 border-b border-line-2">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="num text-[13px] text-ink-3">#{cand.rank}</span>
              <span className="font-semibold text-[19px] tight truncate">{cand.name}</span>
              {cand.hidden_gem && <span className="inline-flex items-center gap-1 rounded-full gem text-[10px] font-bold px-2 py-0.5"><Zap size={10} fill="currentColor" />HIDDEN GEM</span>}
            </div>
            <div className="text-[11.5px] text-ink-3 mt-0.5 flex gap-2 flex-wrap">
              <span>fused <b className="text-ink num">#{cand.rank}</b></span><span>keyword <b className="text-ink num">#{cand.rank_keyword_only}</b></span><span>semantic <b className="text-ink num">#{cand.rank_semantic_only}</b></span>
              <span>must-have coverage <b className="text-ink num">{Math.round(cand.coverage_must * 100)}%</b></span>
              {cand.penalty > 0 && <span className="text-missing">penalty −{Math.round(cand.penalty * 100)}%</span>}
            </div>
          </div>
          <div className="text-right">
            <CountUp value={cand.final_score} className="num text-[30px] font-semibold tight leading-none block" />
            <div className="eyebrow mt-1">score</div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-surface-2 hover:bg-surface-3 grid place-items-center text-ink-2"><X size={14} /></button>
        </div>
        <div className="mt-3 flex items-center gap-1">
          <TabBtn on={tab === 'receipt'} onClick={() => setTab('receipt')} icon={ListChecks}>Receipt</TabBtn>
          <TabBtn on={tab === 'resume'} onClick={() => setTab('resume')} icon={FileText}>Resume</TabBtn>
          <div className="ml-auto flex items-center gap-1.5">
            <GitCompare size={13} className="text-ink-3" />
            <select value={compare?.candidate_id || ''} onChange={(e) => onCompare(e.target.value || null)} className="text-[12px] px-2.5 py-1.5 max-w-[170px] rounded-full">
              <option value="">Compare with…</option>
              {graph.candidates.filter((c) => c.candidate_id !== cand.candidate_id).map((c) => <option key={c.candidate_id} value={c.candidate_id}>#{c.rank} {c.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {compare && cmp ? (
        <Compare a={cand} b={compare} cmp={cmp} reqById={reqById} />
      ) : tab === 'receipt' ? (
        <div className="flex-1 overflow-y-auto">
          <div className="mx-4 mt-3 mb-2 rounded-2xl bg-accent/8 p-4 flex gap-4 items-start">
            <div className="shrink-0 pb-8"><FusionMap cand={cand} reqById={reqById} cfg={graph.config} focusReq={focusReq} setFocusReq={setFocusReq} size={190} /></div>
            <div className="text-[12.5px] leading-relaxed text-ink-2 min-w-0">
              <div className="eyebrow mb-1">How the score was built</div>
              {cand.explanation.summary}
            </div>
          </div>
          {rows.map((p) => {
            const r = reqById[p.req_id]
            const ev = p.evidence[0]
            const active = focusReq === p.req_id
            return (
              <div key={p.req_id} onClick={() => setFocusReq(active ? null : p.req_id)} className={`mx-3 px-3 py-2.5 rounded-2xl cursor-pointer transition-colors ${active ? 'bg-surface-2' : 'hover:bg-surface-2'}`}>
                <div className="flex items-center gap-2">
                  <span className="num text-[10.5px] text-ink-3 w-7">{p.req_id}</span>
                  <span className="font-semibold text-[12.5px] truncate">{r.label}</span>
                  {r.priority === 'must_have' && <span className="text-[9px] font-semibold text-ink-3 tracking-wider">MUST</span>}
                  <span className={`pill pill-${p.verdict} ml-auto`} title={VERDICT_HINT[p.verdict]}>{VERDICT_LABEL[p.verdict]}</span>
                  <span className={`num text-[12px] font-semibold w-12 text-right ${p.contribution > 0 ? 'text-ink' : 'text-ink-3'}`}>+{p.contribution.toFixed(1)}</span>
                </div>
                <div className="flex items-center gap-3 mt-1.5 ml-9">
                  <Bar label="kw" v={p.lex} color="bg-stated" />
                  <Bar label="sem" v={p.sem} color="bg-inferred" />
                  <span className="text-[11px] text-ink-3 truncate">{p.note}</span>
                </div>
                {ev && (
                  <button onClick={(e) => { e.stopPropagation(); setHlLine(ev.line); setTab('resume') }} className="mt-2 ml-9 text-left w-[calc(100%-2.25rem)] rounded-xl bg-surface-2 hover:bg-stated/10 px-3 py-2 transition-colors">
                    <span className="text-[11.5px] text-ink-2 line-clamp-2">“{ev.text}”</span>
                    <span className="text-[10.5px] text-ink-3 font-mono">line {ev.line + 1} · {ev.section.toLowerCase()} · {ev.method}{ev.hops ? ` · ${ev.hops} hop` : ''}</span>
                  </button>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <ResumeView resume={resume} hlLine={hlLine} evLines={evLines} />
      )}
    </motion.div>
  )
}

function TabBtn({ on, onClick, icon: Icon, children }) {
  return <button onClick={onClick} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors ${on ? 'bg-ink text-canvas' : 'text-ink-2 hover:bg-surface-2'}`}><Icon size={13} />{children}</button>
}

function Bar({ label, v, color }) {
  return (
    <span className="flex items-center gap-1.5 w-[88px] shrink-0">
      <span className="text-[9.5px] font-bold uppercase text-ink-3 w-6">{label}</span>
      <span className="flex-1 h-[5px] rounded-full bg-surface-3 overflow-hidden"><motion.span initial={{ width: 0 }} animate={{ width: `${v * 100}%` }} transition={spring} className={`block h-full ${color}`} /></span>
      <span className="num text-[10px] text-ink-3 w-6">{v.toFixed(2)}</span>
    </span>
  )
}

function ResumeView({ resume, hlLine, evLines }) {
  const ref = useRef({})
  useEffect(() => { if (hlLine !== null && ref.current[hlLine]) ref.current[hlLine].scrollIntoView({ block: 'center', behavior: 'smooth' }) }, [hlLine, resume])
  if (!resume) return <div className="flex-1 p-4 space-y-2">{[...Array(12)].map((_, i) => <div key={i} className="h-3 rounded shimmer" style={{ width: `${40 + (i * 37) % 55}%` }} />)}</div>
  const sectionAt = Object.fromEntries(Object.entries(resume.sections).map(([k, v]) => [v, k]))
  return (
    <div className="flex-1 overflow-y-auto font-mono text-[12px] leading-[1.7]">
      <div className="px-5 py-2.5 border-b border-line-2 text-[11px] text-ink-3 flex gap-3 font-sans">
        <span>parser <b className="text-ink">{resume.parse_method}</b></span><span>confidence <b className="text-ink num">{Math.round(resume.parse_confidence * 100)}%</b></span>
        <span>sections <b className="text-ink">{Object.keys(resume.sections).join(' · ').toLowerCase() || 'none'}</b></span>
        {resume.fuzzy_headers > 0 && <span className="text-stated font-medium">{resume.fuzzy_headers} header{resume.fuzzy_headers > 1 ? 's' : ''} fuzzy-recovered</span>}
      </div>
      <div className="py-2">
        {resume.lines.map((l, i) => (
          <div key={i} ref={(el) => (ref.current[i] = el)} className={`flex px-3 ${i === hlLine ? 'hl-line' : evLines.has(i) ? 'ev-line' : ''}`}>
            <span className="w-8 shrink-0 text-right pr-3 text-ink-3 select-none num text-[10.5px]">{i + 1}</span>
            <span className={`whitespace-pre-wrap ${sectionAt[i] ? 'font-bold text-accent' : ''}`}>{l || ' '}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Compare({ a, b, cmp, reqById }) {
  const deltas = cmp.deltas.filter((d) => Math.abs(d.delta) >= 0.3).slice(0, 10)
  const max = Math.max(...deltas.map((d) => Math.abs(d.delta)), 1)
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-4 my-3 rounded-2xl px-4 py-3 bg-stated/10 text-[12.5px] leading-relaxed text-ink-2">{cmp.text}</div>
      <div className="px-4 py-2 flex items-center eyebrow">
        <span className="flex-1">{a.name.split(' ')[0]} ← requirement → {b.name.split(' ')[0]}</span><span>Δ pts</span>
      </div>
      {deltas.map((d) => {
        const pos = d.delta > 0
        return (
          <div key={d.req_id} className="px-4 py-2 border-b border-line-2">
            <div className="flex items-center gap-2 text-[12px]">
              <span className="num text-[10.5px] text-ink-3 w-7">{d.req_id}</span>
              <span className="font-semibold truncate">{d.label}</span>
              <span className={`pill pill-${d.a.verdict}`}>{VERDICT_LABEL[d.a.verdict]}</span>
              <span className="text-ink-3">vs</span>
              <span className={`pill pill-${d.b.verdict}`}>{VERDICT_LABEL[d.b.verdict]}</span>
              <span className={`ml-auto num font-semibold ${pos ? 'text-confirmed' : 'text-missing'}`}>{pos ? '+' : ''}{d.delta.toFixed(1)}</span>
            </div>
            <div className="mt-1.5 ml-9 flex items-center h-[6px]">
              <div className="flex-1 flex justify-end"><motion.div initial={{ width: 0 }} animate={{ width: pos ? `${(d.delta / max) * 100}%` : 0 }} className="h-full rounded-l bg-confirmed" /></div>
              <div className="w-px h-3 bg-ink-3" />
              <div className="flex-1"><motion.div initial={{ width: 0 }} animate={{ width: !pos ? `${(-d.delta / max) * 100}%` : 0 }} className="h-full rounded-r bg-missing" /></div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
