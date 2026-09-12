import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, Check, ShieldCheck, EyeOff } from 'lucide-react'
import { api } from '../api'
import Leaderboard from './Leaderboard'

const SEV = { high: 'bg-missing', medium: 'bg-stated/100', low: 'bg-weak' }
const SEVN = { high: 3, medium: 2, low: 1 }
const impact = (f) => (f.counterfactual?.movers?.length || 0) * 100 + (f.hard_filter?.rejects || 0) * 10 + SEVN[f.severity]
const sorted = (flags) => [...(flags || [])].sort((a, b) => impact(b) - impact(a))

export default function Audit({ graph, flags, setFlags, onApply, prevRanks, onSelect }) {
  const [loading, setLoading] = useState(false)
  const [blind, setBlind] = useState(null)
  const [active, setActive] = useState(null)
  useEffect(() => { if (!flags) { setLoading(true); api.audit().then((r) => { setFlags(r.flags); setLoading(false) }) } }, [flags, setFlags])

  const segments = useMemo(() => {
    const text = graph.jd_text
    const marks = []
    for (const f of flags || []) {
      const idx = text.toLowerCase().indexOf(f.phrase.toLowerCase())
      if (idx >= 0) marks.push({ start: idx, end: idx + f.phrase.length, flag: f })
    }
    marks.sort((a, b) => a.start - b.start)
    const out = []
    let pos = 0
    for (const m of marks) {
      if (m.start < pos) continue
      out.push({ text: text.slice(pos, m.start) })
      out.push({ text: text.slice(m.start, m.end), flag: m.flag })
      pos = m.end
    }
    out.push({ text: text.slice(pos) })
    return out
  }, [graph.jd_text, flags])

  const hiding = (flags || []).reduce((n, f) => Math.max(n, f.hard_filter?.top_rejects?.length || 0), 0)

  return (
    <div className="h-full grid grid-cols-[minmax(0,1fr)_380px_minmax(0,460px)] gap-4 px-5 pb-5 pt-1">
      <div className="card flex flex-col min-h-0 overflow-hidden">
        <div className="px-6 pt-5 pb-3 flex items-center gap-3">
          <div>
            <div className="text-[17px] font-semibold tight">Job description</div>
            <div className="text-[12px] text-ink-3 mt-0.5">Flagged phrases are re-run as counterfactuals against this pool.</div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {flags && <span className="pill bg-missing/10 text-missing ring-1 ring-missing/25"><AlertTriangle size={11} /> {flags.length} flag{flags.length !== 1 ? 's' : ''}</span>}
            {hiding > 0 && <span className="pill bg-stated/15 text-stated ring-1 ring-stated/30">{hiding} top-8 candidates at risk</span>}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-[640px] mx-auto whitespace-pre-wrap text-[14px] leading-[1.8] text-ink">
            {segments.map((s, i) => s.flag ? (
              <mark key={i} onMouseEnter={() => setActive(s.flag.id)} onMouseLeave={() => setActive(null)}
                className={`rounded px-0.5 cursor-pointer transition-colors ${active === s.flag.id ? 'bg-missing/30 ring-2 ring-missing/60' : 'bg-missing/15 underline decoration-missing/70 decoration-wavy'}`}>{s.text}</mark>
            ) : <span key={i}>{s.text}</span>)}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 min-h-0 overflow-y-auto">
        {loading && <div className="card p-4 space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-16 rounded-lg shimmer" />)}</div>}
        {sorted(flags).map((f) => (
            <motion.div key={f.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              onMouseEnter={() => setActive(f.id)} onMouseLeave={() => setActive(null)}
              className={`card p-4 transition-all ${active === f.id ? 'border-missing/40' : ''}`}>
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${SEV[f.severity]}`} />
                <span className="eyebrow !text-ink-2">{f.label}</span>
                <span className="ml-auto text-[10.5px] text-ink-3">{f.severity}</span>
              </div>
              <div className="mt-1.5 font-semibold text-[13px]">“{f.phrase}”</div>
              <div className="text-[12px] text-ink-2 mt-1">{f.reason}</div>
              {f.hard_filter && f.hard_filter.rejects > 0 && (
                <div className="mt-2.5 rounded-lg px-3 py-2 text-[12px] bg-missing/10 text-missing ring-1 ring-missing/25">
                  <div className="font-semibold">A keyword ATS hard-filtering on this would reject {f.hard_filter.rejects} of {f.hard_filter.total}</div>
                  {f.hard_filter.top_rejects.length > 0 && <div className="mt-1 flex flex-wrap gap-1">{f.hard_filter.top_rejects.map((m) => <span key={m.candidate_id} className="rounded bg-surface-solid/70 px-1.5 py-0.5 num">#{m.rank} {m.name.split(' ')[0]}</span>)}</div>}
                  <div className="text-[11px] text-missing/80 mt-1">Caliper never hard-filters. It penalises softly and shows the penalty.</div>
                </div>
              )}
              {f.counterfactual && (
                <div className={`mt-2.5 rounded-lg px-3 py-2 text-[12px] ${f.counterfactual.movers.length ? 'bg-stated/12 text-stated ring-1 ring-stated/25' : 'bg-surface-2 text-ink-2'}`}>
                  {f.counterfactual.movers.length ? (
                    <>
                      <div className="font-semibold">Hiding {f.counterfactual.movers.length} candidate{f.counterfactual.movers.length > 1 ? 's' : ''} in this pool</div>
                      <div className="mt-1 flex flex-wrap gap-1">{f.counterfactual.movers.map((m) => <span key={m.candidate_id} className="rounded bg-surface-solid/70 px-1.5 py-0.5 num">{m.name.split(' ')[0]} #{m.from}→#{m.to}</span>)}</div>
                    </>
                  ) : <span>Measured: relaxing this phrase does not change the ranking of this pool.</span>}
                </div>
              )}
              <div className="mt-2.5 flex items-center gap-2">
                <div className="text-[11.5px] text-ink-3 flex-1 truncate" title={f.rewrite}>{f.replacement ? <>Rewrite → <span className="text-confirmed font-medium">“{f.replacement}”</span></> : f.rewrite}</div>
                {f.replacement && <button onClick={() => onApply(f)} className="btn btn-primary !py-1 !px-2.5"><Check size={13} /> Accept</button>}
              </div>
            </motion.div>
          ))}
        {flags && flags.length === 0 && <div className="card p-6 text-center text-ink-2"><ShieldCheck className="mx-auto mb-2 text-confirmed" />No bias or narrowness flags in this JD.</div>}

        <div className="card p-3.5">
          <div className="flex items-center gap-2"><EyeOff size={13} className="text-ink-3" /><span className="eyebrow">Blind-mode adverse impact</span></div>
          <div className="text-[12px] text-ink-2 mt-1">Strip names, emails, colleges and pronouns, re-rank, measure mean rank displacement Δ.</div>
          {blind ? (
            <div className="mt-2">
              <div className="num text-[22px] font-bold">Δ = {blind.delta_blind}</div>
              <div className="text-[11.5px] text-ink-3">{blind.delta_blind < 0.5 ? 'Negligible displacement — identity signals are not driving the ranking.' : 'Material displacement — review the flagged candidates.'}</div>
              <div className="mt-2 flex flex-wrap gap-1">{blind.ranks.filter((r) => r.rank !== r.rank_blind).slice(0, 8).map((r) => <span key={r.candidate_id} className="rounded bg-surface-3 px-1.5 py-0.5 text-[11px] num">{r.name.split(' ')[0]} #{r.rank}→#{r.rank_blind}</span>)}</div>
            </div>
          ) : <button className="btn btn-ghost mt-2" onClick={() => api.blind().then(setBlind)}>Run blind re-rank</button>}
        </div>
      </div>

      <Leaderboard graph={graph} selected={null} compareWith={null} onSelect={onSelect} prevRanks={prevRanks} focusReq={null} compact />
    </div>
  )
}
