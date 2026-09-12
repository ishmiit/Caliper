import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts'
import { api } from '../api'

const LABELS = { 3: 'Strong', 2: 'Medium', 1: 'Weak' }

export default function Evaluate({ graph, config, onConfig, onSelect }) {
  const [abl, setAbl] = useState(null)
  const [labels, setLabels] = useState({})
  const [saving, setSaving] = useState(false)
  useEffect(() => { api.ablation().then((r) => { setAbl(r.rows); setLabels(r.labels || {}) }) }, [graph])

  const setLabel = (cid, v) => setLabels((l) => ({ ...l, [cid]: l[cid] === v ? 0 : v }))
  const save = async () => { setSaving(true); const r = await api.labels(labels); setAbl(r.rows); setSaving(false); onConfig({}) }
  const nLabelled = Object.values(labels).filter(Boolean).length

  return (
    <div className="h-full grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4 px-5 pb-5 pt-1 overflow-hidden">
      <div className="flex flex-col gap-4 min-h-0">
        <div className="card p-6">
          <div className="flex items-center gap-3">
            <div>
              <div className="text-[17px] font-semibold tight">Ablation</div>
              <div className="text-[12px] text-ink-3 mt-0.5">nDCG@5 and Spearman ρ against hand-labelled ground truth, measured on this pool.</div>
            </div>
          </div>
          {abl ? (
            <table className="w-full mt-4 text-[12.5px]">
              <thead><tr className="eyebrow"><th className="text-left py-1.5">Configuration</th><th className="text-right">nDCG@5</th><th className="text-right">Spearman ρ</th><th className="text-right">Spread</th></tr></thead>
              <tbody>
                {abl.map((r) => {
                  const best = r.config.startsWith('Fused (')
                  return (
                    <tr key={r.config} className={`border-t border-line-2 ${best ? 'bg-accent/8 font-semibold' : ''}`}>
                      <td className="py-2">{r.config}</td>
                      <td className="text-right num">{r.ndcg5.toFixed(2)}</td>
                      <td className="text-right num">{r.spearman === null ? '—' : r.spearman.toFixed(2)}</td>
                      <td className="text-right num text-ink-3">{r.spread}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <div className="mt-4 rounded-lg bg-stated/12 ring-1 ring-stated/25 text-stated px-4 py-3 text-[12.5px]">
              No ground-truth labels yet. Label the pool on the right (strong / medium / weak) and the ablation table computes from real measurements.
            </div>
          )}
        </div>

        <div className="card p-6">
          <div className="text-[17px] font-semibold tight">Let the judge drive</div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 mt-3">
            <Slider label="Must-have weight" v={config.w_must ?? 3} min={1} max={5} step={0.5} onChange={(v) => onConfig({ w_must: v })} />
            <Slider label="Inferred credit cap α" v={config.alpha_inferred ?? 0.65} min={0.2} max={1} step={0.05} onChange={(v) => onConfig({ alpha_inferred: v })} />
            <Slider label="Keyword threshold τ_lex" v={config.tau_lex ?? 0.35} min={0.1} max={0.8} step={0.05} onChange={(v) => onConfig({ tau_lex: v })} />
            <Slider label="Semantic threshold τ_sem" v={config.tau_sem ?? 0.55} min={0.3} max={0.9} step={0.05} onChange={(v) => onConfig({ tau_sem: v })} />
          </div>
          <div className="mt-3 flex gap-2">
            <Chk label="Ontology" on={config.ontology_on ?? true} onChange={(v) => onConfig({ ontology_on: v })} />
            <Chk label="Cohort calibration" on={config.calibrate_on ?? true} onChange={(v) => onConfig({ calibrate_on: v })} />
            <button className="btn btn-ghost ml-auto" onClick={() => onConfig({ w_must: 3, alpha_inferred: 0.65, tau_lex: 0.35, tau_sem: 0.55, ontology_on: true, calibrate_on: true })}>Reset</button>
          </div>
        </div>

        <div className="card p-6 flex-1 min-h-0">
          <div className="text-[17px] font-semibold tight">Fit shape <span className="text-[12px] font-normal text-ink-3 ml-2">top 3 vs JD target</span></div>
          <FitRadar graph={graph} />
        </div>
      </div>

      <div className="card flex flex-col min-h-0 overflow-hidden">
        <div className="px-6 pt-5 pb-3 flex items-center gap-3">
          <div>
            <div className="text-[17px] font-semibold tight">Ground truth</div>
            <div className="text-[12px] text-ink-3 mt-0.5">Label each candidate strong / medium / weak. KW · Sem · Fused are the three rankings.</div>
          </div>
          <span className="ml-auto text-[11.5px] text-ink-3 num">{nLabelled}/{graph.candidates.length} labelled</span>
          <button className="btn btn-primary" onClick={save} disabled={saving || nLabelled < 3}>{saving ? 'Computing…' : 'Save & measure'}</button>
        </div>
        <div className="grid grid-cols-[1fr_54px_54px_54px_180px] px-6 py-1.5 eyebrow border-b border-line-2">
          <span>Candidate</span><span className="text-center">KW</span><span className="text-center">Sem</span><span className="text-center">Fused</span><span className="text-center">Label</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {graph.candidates.map((c) => (
            <div key={c.candidate_id} className="grid grid-cols-[1fr_54px_54px_54px_180px] items-center px-6 py-2 border-b border-line-2 hover:bg-surface-2">
              <button onClick={() => onSelect(c.candidate_id)} className="text-left font-semibold text-[12.5px] truncate hover:text-accent">{c.name}</button>
              <RankCell r={c.rank_keyword_only} /><RankCell r={c.rank_semantic_only} /><RankCell r={c.rank} bold />
              <div className="flex justify-center gap-1">
                {[3, 2, 1].map((v) => (
                  <button key={v} onClick={() => setLabel(c.candidate_id, v)} className={`text-[11px] font-semibold rounded-full px-2.5 py-1 transition-colors ${labels[c.candidate_id] === v ? (v === 3 ? 'bg-confirmed text-white' : v === 2 ? 'bg-stated text-white' : 'bg-weak text-white') : 'bg-surface-2 text-ink-2 hover:bg-surface-3'}`}>{LABELS[v]}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function RankCell({ r, bold }) { return <span className={`text-center num text-[12px] ${bold ? 'font-bold text-ink' : 'text-ink-3'}`}>#{r}</span> }

function Slider({ label, v, min, max, step, onChange }) {
  const [local, setLocal] = useState(v)
  useEffect(() => setLocal(v), [v])
  return (
    <label className="block">
      <div className="flex justify-between text-[11.5px]"><span className="text-ink-2 font-medium">{label}</span><span className="num text-ink">{Number(local).toFixed(2)}</span></div>
      <input type="range" min={min} max={max} step={step} value={local} onChange={(e) => setLocal(Number(e.target.value))} onMouseUp={() => onChange(local)} onTouchEnd={() => onChange(local)} className="w-full " />
    </label>
  )
}

function Chk({ label, on, onChange }) {
  return <button onClick={() => onChange(!on)} className={`btn ${on ? 'bg-ink text-canvas' : 'btn-ghost'}`}>{on ? '●' : '○'} {label}</button>
}

const CLUSTERS = {
  Frontend: ['react', 'html', 'css', 'javascript', 'typescript', 'responsive design', 'frontend framework', 'tailwind', 'vue', 'angular', 'next.js', 'ui/ux'],
  Backend: ['node.js', 'rest api', 'express', 'python', 'django', 'flask', 'fastapi', 'java', 'spring', 'authentication', 'jwt', 'graphql'],
  Data: ['mongodb', 'postgresql', 'mysql', 'sql', 'redis', 'firebase', 'supabase', 'database', 'prisma'],
  DevOps: ['docker', 'aws', 'gcp', 'azure', 'ci/cd', 'github actions', 'kubernetes', 'deployment', 'cloud', 'testing', 'jest', 'cypress'],
  People: ['communication', 'collaboration', 'problem solving', 'agile', 'git', 'github', 'internship', 'hackathon', 'computer science'],
}

function FitRadar({ graph }) {
  const top = graph.candidates.slice(0, 3)
  const clusterOf = (r) => {
    for (const [k, terms] of Object.entries(CLUSTERS)) if (r.terms.some((t) => terms.includes(t))) return k
    return 'People'
  }
  const data = Object.keys(CLUSTERS).map((k) => {
    const reqs = graph.requirements.filter((r) => clusterOf(r) === k)
    const row = { axis: k, target: reqs.length ? 100 : 0 }
    for (const c of top) {
      const fits = reqs.map((r) => c.per_requirement.find((p) => p.req_id === r.req_id)?.fit ?? 0)
      row[c.candidate_id] = reqs.length ? Math.round((fits.reduce((a, b) => a + b, 0) / reqs.length) * 100) : 0
    }
    return row
  })
  const cs = getComputedStyle(document.documentElement)
  const colors = [cs.getPropertyValue('--accent').trim(), cs.getPropertyValue('--confirmed').trim(), cs.getPropertyValue('--stated').trim()]
  const grid = cs.getPropertyValue('--line').trim(), tick = cs.getPropertyValue('--ink-2').trim(), tgt = cs.getPropertyValue('--ink-3').trim()
  return (
    <div className="h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke={grid} />
          <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11, fill: tick }} />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Radar dataKey="target" stroke={tgt} fill={tgt} fillOpacity={0.12} strokeDasharray="4 3" />
          {top.map((c, i) => <Radar key={c.candidate_id} name={c.name} dataKey={c.candidate_id} stroke={colors[i]} fill={colors[i]} fillOpacity={0.08} strokeWidth={2} />)}
        </RadarChart>
      </ResponsiveContainer>
      <div className="flex gap-4 justify-center -mt-2 text-[11px]">{top.map((c, i) => <span key={c.candidate_id} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: colors[i] }} />{c.name}</span>)}</div>
    </div>
  )
}
