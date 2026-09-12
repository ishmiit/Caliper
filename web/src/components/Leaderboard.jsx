import { motion, AnimatePresence } from 'framer-motion'
import { Zap, ArrowUp, ArrowDown } from 'lucide-react'
import { CountUp } from './fx'

const spring = { type: 'spring', stiffness: 380, damping: 34 }

export default function Leaderboard({ graph, selected, compareWith, onSelect, prevRanks, focusReq, compact = false }) {
  const cands = graph.candidates
  const max = Math.max(...cands.map((c) => c.final_score), 1)
  return (
    <div className="card flex flex-col min-h-0 overflow-hidden">
      <div className="px-6 pt-5 pb-3 flex items-baseline gap-3">
        <div className="text-[17px] font-semibold tight">Shortlist</div>
        <div className="text-[12px] text-ink-3">{cands.length} candidates · ranked by fused evidence</div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <AnimatePresence initial={false}>
          {cands.map((c, i) => {
            const prev = prevRanks[c.candidate_id]
            const delta = prev ? prev - c.rank : 0
            const isSel = c.candidate_id === selected
            const isCmp = c.candidate_id === compareWith
            return (
              <motion.div layout key={c.candidate_id} transition={spring} initial={{ opacity: 0, y: 18, filter: 'blur(4px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)', transition: { ...spring, delay: Math.min(i * 0.045, 0.7) } }}
                onClick={() => onSelect(c.candidate_id)} whileHover={{ x: 2 }}
                className={`group flex items-center gap-4 px-4 py-3 rounded-2xl cursor-pointer transition-colors ${i < 3 ? `rail-${i + 1}` : ''} ${isSel ? 'bg-accent/10' : isCmp ? 'bg-stated/10' : 'hover:bg-surface-2'}`}>
                <div className="w-9 flex flex-col items-center leading-none">
                  <span className={`num text-[17px] font-semibold tight ${i < 3 ? 'text-ink' : 'text-ink-2'}`}>{c.rank}</span>
                  <Delta d={delta} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold text-[14px] tight truncate">{c.name}</span>
                    {c.hidden_gem && (
                      <motion.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ ...spring, delay: 0.15 }} className="gem inline-flex items-center gap-1 rounded-full text-[10px] font-bold px-2 py-[3px] whitespace-nowrap">
                        <Zap size={10} fill="currentColor" /> HIDDEN GEM
                      </motion.span>
                    )}
                  </div>
                  <div className="text-[11.5px] text-ink-3 mt-0.5 flex items-center gap-2 whitespace-nowrap overflow-hidden">
                    <span>{c.months_experience ? `${c.months_experience} mo experience` : 'no dated experience'}</span>
                    {c.parse_confidence < 0.85 && <><span>·</span><span className="text-stated">parse {Math.round(c.parse_confidence * 100)}%</span></>}
                    {c.penalty > 0 && <><span>·</span><span className="text-missing">−{Math.round(c.penalty * 100)}% coverage</span></>}
                    {c.hidden_gem && <><span>·</span><span className="text-stated">#{c.rank_keyword_only} by keyword</span></>}
                  </div>
                </div>
                {!compact && (
                  <div className="w-[132px] flex flex-wrap gap-[3px] opacity-80 group-hover:opacity-100 transition-opacity">
                    {c.per_requirement.map((p) => (
                      <span key={p.req_id} title={`${p.req_id} · ${p.verdict} · fit ${p.fit}`}
                        className={`h-[7px] w-[7px] rounded-full dot-${p.verdict} transition-all ${focusReq && focusReq !== p.req_id ? 'opacity-20' : ''} ${focusReq === p.req_id ? 'ring-2 ring-ink scale-125' : ''}`} />
                    ))}
                  </div>
                )}
                <div className="w-[150px] flex items-center gap-3">
                  <div className="flex-1 h-[5px] rounded-full bg-surface-3 overflow-hidden">
                    <motion.div layout className="h-full rounded-full score-bar" initial={false} animate={{ width: `${(c.final_score / max) * 100}%` }} transition={spring} />
                  </div>
                  <CountUp value={c.final_score} className="num text-[15px] font-semibold tight w-11 text-right inline-block" />
                </div>
                {!compact && (
                  <div className="w-[60px] text-right num text-[11px] text-ink-3 whitespace-nowrap" title="rank by keyword-only · semantic-only">
                    <span className={c.rank_keyword_only - c.rank >= 5 ? 'text-stated font-semibold' : ''}>{c.rank_keyword_only}</span>
                    <span className="mx-1 opacity-40">·</span>
                    <span>{c.rank_semantic_only}</span>
                  </div>
                )}
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
      {!compact && (
        <div className="px-6 py-3 flex items-center gap-4 text-[11px] text-ink-3 border-t border-line-2">
          <Legend cls="dot-CONFIRMED" label="Confirmed" /><Legend cls="dot-STATED" label="Stated" /><Legend cls="dot-INFERRED" label="Inferred" /><Legend cls="dot-MISSING" label="Missing" />
          <span className="ml-auto">kw · sem = rank by each channel alone</span>
        </div>
      )}
    </div>
  )
}

function Legend({ cls, label }) {
  return <span className="inline-flex items-center gap-1.5"><span className={`h-[7px] w-[7px] rounded-full ${cls}`} />{label}</span>
}

function Delta({ d }) {
  if (!d) return <span className="h-3" />
  const up = d > 0
  return (
    <motion.span initial={{ opacity: 0, y: up ? 4 : -4 }} animate={{ opacity: 1, y: 0 }} className={`flex items-center text-[10px] font-bold ${up ? 'text-confirmed' : 'text-missing'}`}>
      {up ? <ArrowUp size={9} strokeWidth={3} /> : <ArrowDown size={9} strokeWidth={3} />}{Math.abs(d)}
    </motion.span>
  )
}
