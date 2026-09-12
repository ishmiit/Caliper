import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { api } from '../api'
import Bar from '../ui/Bar'
import Pool from '../ui/Pool'

const V = (v) => (v === 'WEAK' ? 'missing' : v.toLowerCase())
const DEPTH = { professional: 'professional experience', internship: 'internship', project: 'project', listed: 'listed only' }

export default function Console({ graph, config, onToggle, selected, setSelected, prevRanks, onRedline, onReset }) {
  const cand = useMemo(() => graph.candidates.find((c) => c.candidate_id === selected) || graph.candidates[0], [graph, selected])
  const reqById = useMemo(() => Object.fromEntries(graph.requirements.map((r) => [r.req_id, r])), [graph])
  const rows = useMemo(() => graph.requirements.map((r) => cand.per_requirement.find((p) => p.req_id === r.req_id)), [graph, cand])

  return (
    <div className="console h-full bg-bone text-ink flex flex-col overflow-hidden">
      <Bar graph={graph} config={config} onToggle={onToggle} onReset={onReset}
        right={<button onClick={onRedline} className="text-[12.5px] text-ink underline decoration-n3 underline-offset-4 hover:decoration-ink">Redline</button>} />
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[172px_minmax(0,1fr)_122px] overflow-y-auto md:overflow-hidden">
        <div className="md:border-r hairline min-h-0 max-h-[38vh] md:max-h-none flex flex-col">
          <Pool graph={graph} selected={cand.candidate_id} setSelected={setSelected} prevRanks={prevRanks} />
        </div>
        <Reading cand={cand} rows={rows} reqById={reqById} graph={graph} setSelected={setSelected} />
        <Brief rows={rows} reqById={reqById} />
      </div>
    </div>
  )
}

function Reading({ cand, rows, reqById, graph, setSelected }) {
  const ordered = [...rows].sort((a, b) => b.contribution - a.contribution)
  const n = cand.per_requirement.length
  const conf = cand.per_requirement.filter((p) => p.verdict === 'CONFIRMED').length
  const inf = cand.per_requirement.filter((p) => p.verdict === 'INFERRED').length
  const miss = cand.per_requirement.filter((p) => ['MISSING', 'WEAK'].includes(p.verdict)).length
  return (
    <div className="min-h-[60vh] md:min-h-0 flex flex-col md:border-r hairline">
      <div className="px-5 pt-4 pb-3 border-b hairline flex items-baseline gap-4 flex-wrap">
        <span className="marker text-n2">Reading</span>
        <span className="text-[13px] font-medium">{cand.name}</span>
        <span className="text-[12.5px] text-n6 num">{conf} confirmed · {inf} inferred · {miss} missing of {n}</span>
        <span className="ml-auto num text-[13px] font-medium">{cand.final_score.toFixed(1)}</span>
      </div>
      {cand.hidden_gem && (
        <div className="px-5 py-2.5 border-b hairline text-[12.5px] text-n6">
          A keyword-only screen ranks this candidate #{cand.rank_keyword_only}. Caliper ranks them #{cand.rank}.
        </div>
      )}
      <DepthLine d={cand.depth} />
      {cand.integrity?.length > 0 && (
        <div className="px-5 py-2.5 border-b hairline">
          <div className="marker text-n2 mb-1.5">Integrity</div>
          {cand.integrity.map((f, i) => (
            <div key={i} className={`text-[12.5px] leading-[1.5] pl-3 mb-1 ${f.severity === 'high' ? 'border-l-2 border-ink text-ink' : 'border-l border-n3 text-n6'}`}>{f.text}</div>
          ))}
        </div>
      )}
      {cand.duplicates?.length > 0 && (
        <div className="px-5 py-2.5 border-b hairline text-[12.5px] text-n6">Near-identical to {cand.duplicates.length} other resume{cand.duplicates.length > 1 ? 's' : ''} in this pool.</div>
      )}
      <div className="flex-1 overflow-y-auto px-5 py-2" key={cand.candidate_id}>
        {ordered.map((p, i) => <Evidence key={p.req_id} p={p} r={reqById[p.req_id]} index={i} />)}
      </div>
      <Ask graph={graph} setSelected={setSelected} />
    </div>
  )
}

function DepthLine({ d }) {
  if (!d) return null
  const parts = [['professional', d.professional, 'in professional roles'], ['internship', d.internship, 'in internships'], ['project', d.project, 'in projects'], ['listed', d.listed, 'listed only']].filter((x) => x[1] > 0)
  if (!parts.length) return null
  return (
    <div className="px-5 py-2.5 border-b hairline text-[12.5px] text-n6 num">
      Evidence depth: {parts.map((x, i) => <span key={x[0]}>{i > 0 && ' · '}<span className={x[0] === 'listed' ? 'text-n2' : 'text-ink'}>{x[1]} {x[2]}</span></span>)}
    </div>
  )
}

function Evidence({ p, r, index }) {
  const v = V(p.verdict)
  const ev = p.evidence[0]
  const depth = ev?.depth ? DEPTH[ev.depth] : null
  const meta = [v, depth, ev?.hops ? `${ev.hops} hop` : null, ev ? `line ${ev.line + 1}` : null, p.fit ? p.fit.toFixed(2) : null].filter(Boolean).join(' · ')
  return (
    <div className="py-3 border-b hairline last:border-b-0">
      <div className="flex items-baseline gap-2">
        <span className="num text-[11.5px] text-n2">{p.req_id}</span>
        <span className="text-[13px] font-medium">{r.label}</span>
        {r.priority === 'must_have' && <span className="text-[10.5px] text-n2">must</span>}
        <span className="ml-auto num text-[12px] text-n6">+{p.contribution.toFixed(1)}</span>
      </div>
      <motion.div initial={{ clipPath: 'inset(0 100% 0 0)' }} animate={{ clipPath: 'inset(0 0% 0 0)' }} transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.2), ease: 'easeOut' }}
        className={`mt-2 pl-3 v-${v}`}>
        {ev ? (
          <div className="text-[13px] leading-[1.5] text-ink">{'“'}{ev.text}{'”'}</div>
        ) : (
          <div className="text-[13px] leading-[1.5] text-n2">No line in this resume supports it.</div>
        )}
        <div className="num text-[11.5px] text-n2 mt-1">{meta}</div>
      </motion.div>
      {(v === 'inferred' || v === 'stated') && p.note && <div className="mt-1.5 pl-3 text-[12.5px] text-n6">{p.note}</div>}
    </div>
  )
}

function Brief({ rows, reqById }) {
  return (
    <div className="min-h-0 flex flex-col">
      <div className="marker text-n2 px-4 pt-4 pb-3 border-b hairline">Brief</div>
      <div className="px-4 pt-4">
        <div className="flex flex-wrap gap-[5px]" aria-label="Requirement coverage">
          {rows.map((p) => <span key={p.req_id} title={`${p.req_id} · ${reqById[p.req_id].label} · ${V(p.verdict)}`} className={`chip chip-${V(p.verdict)} ${reqById[p.req_id].priority !== 'must_have' ? 'opacity-70' : ''}`} />)}
        </div>
        <div className="mt-5 space-y-1.5 text-[11.5px] text-n6">
          <Legend cls="chip-confirmed" label="confirmed" /><Legend cls="chip-inferred" label="inferred" /><Legend cls="chip-stated" label="stated" /><Legend cls="chip-missing" label="missing" />
        </div>
        <div className="mt-6 text-[11.5px] text-n2 leading-[1.5]">{rows.length} requirements. Must-haves weigh 3×, nice-to-haves 1×.</div>
      </div>
    </div>
  )
}

function Legend({ cls, label }) {
  return <div className="flex items-center gap-2"><span className={`chip ${cls}`} style={{ width: 9, height: 9 }} />{label}</div>
}

function Ask({ graph, setSelected }) {
  const [q, setQ] = useState('')
  const [a, setA] = useState(null)
  const [busy, setBusy] = useState(false)
  const nameOf = (cid) => graph.candidates.find((c) => c.candidate_id === cid)?.name?.split(' ')[0] || cid
  const send = async (e) => {
    e.preventDefault()
    if (!q.trim()) return
    setBusy(true)
    try { setA(await api.chat(q)) } finally { setBusy(false) }
  }
  return (
    <div className="border-t hairline px-5 py-3">
      {a && (
        <div className="text-[12.5px] leading-[1.55] text-ink mb-2">
          {a.text}
          {a.citations?.length > 0 && (
            <span className="ml-2 text-n2 num">
              {a.citations.filter((c) => c.candidate_id).slice(0, 4).map((c, i) => (
                <button key={i} onClick={() => setSelected(c.candidate_id)} className="underline decoration-n3 underline-offset-2 mr-2 hover:decoration-ink">{nameOf(c.candidate_id)}{c.req_id ? ` ${c.req_id}` : ''}{c.line != null ? ` · line ${c.line + 1}` : ''}</button>
              ))}
            </span>
          )}
        </div>
      )}
      <form onSubmit={send} className="flex items-center gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Why is #1 above #2? Who is missing Docker?" className="flex-1 bg-transparent text-[12.5px] placeholder:text-n2 py-1 border-b hairline focus:border-ink focus:outline-none" aria-label="Ask about the ranking" />
        <button className="text-[12.5px] text-n2 hover:text-ink" disabled={busy}>{busy ? 'reading' : 'ask'}</button>
      </form>
    </div>
  )
}
