import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import Bar from '../ui/Bar'
import Pool from '../ui/Pool'

export default function Redline({ graph, flags, setFlags, onApply, selected, setSelected, prevRanks, onBack, config, onToggle, onReset }) {
  const [doc, setDoc] = useState(null)
  const [accepted, setAccepted] = useState({})
  const [busy, setBusy] = useState(null)
  const [blind, setBlind] = useState(null)
  const [blindBusy, setBlindBusy] = useState(false)
  const runBlind = async () => { setBlindBusy(true); try { setBlind(await api.blind()) } finally { setBlindBusy(false) } }

  useEffect(() => {
    if (flags) return
    api.audit().then((r) => { setFlags(r.flags); setDoc(graph.jd_text) })
  }, [flags, setFlags, graph.jd_text])
  useEffect(() => { if (doc === null && flags) setDoc(graph.jd_text) }, [doc, flags, graph.jd_text])

  const sorted = useMemo(() => [...(flags || [])].sort((a, b) => impact(b) - impact(a)), [flags])

  const segments = useMemo(() => {
    const text = doc || ''
    const marks = []
    for (const f of sorted) {
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
  }, [doc, sorted])

  const accept = async (f) => {
    setBusy(f.id)
    try {
      await onApply(f)
      setAccepted((a) => ({ ...a, [f.id]: f.replacement }))
    } finally { setBusy(null) }
  }

  return (
    <div className="console h-full bg-bone text-ink flex flex-col overflow-hidden">
      <Bar graph={graph} config={config} onToggle={onToggle} onReset={onReset}
        right={<button onClick={onBack} className="text-[12.5px] text-ink underline decoration-n3 underline-offset-4 hover:decoration-ink">Console</button>} />
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[172px_minmax(0,1fr)_196px] overflow-y-auto md:overflow-hidden">
        <div className="md:border-r hairline min-h-0 max-h-[32vh] md:max-h-none flex flex-col">
          <Pool graph={graph} selected={selected} setSelected={setSelected} prevRanks={prevRanks} />
        </div>

        <div className="min-h-[60vh] md:min-h-0 flex flex-col md:border-r hairline">
          <div className="px-5 pt-4 pb-3 border-b hairline flex items-baseline gap-4">
            <span className="marker text-n2">Brief</span>
            <span className="text-[12.5px] text-n6 num">{sorted.length} flagged phrase{sorted.length === 1 ? '' : 's'} · {Object.keys(accepted).length} accepted</span>
          </div>
          <div className="flex-1 overflow-y-auto px-6 md:px-10 py-8">
            <div className="max-w-[560px] whitespace-pre-wrap text-[14px] leading-[1.7] text-ink">
              {doc === null ? <span className="text-n2">Reading the brief.</span> : segments.map((s, i) => {
                if (!s.flag) return <span key={i}>{s.text}</span>
                const rep = accepted[s.flag.id]
                if (rep !== undefined) return <span key={i}><span className="strike text-n2">{s.text}</span>{rep && <span className="text-azurite"> {rep}</span>}</span>
                return <mark key={i} className="bg-highlight text-ink" style={{ padding: '0 1px' }}>{s.text}</mark>
              })}
            </div>
          </div>
        </div>

        <div className="min-h-0 overflow-y-auto">
          <div className="marker text-n2 px-4 pt-4 pb-3 border-b hairline">Margin</div>
          {!flags && <div className="px-4 py-4 text-[12.5px] text-n2">Reading the brief against the pool.</div>}
          {flags && flags.length === 0 && <div className="px-4 py-4 text-[12.5px] text-n6">Nothing in this brief narrows the pool.</div>}
          <div className="px-4 py-4 space-y-5">
            <div className="pl-3 border-l-2" style={{ borderColor: blind ? (blind.delta_score >= 1.0 ? 'var(--azurite)' : 'var(--missing)') : 'var(--missing)' }}>
              <div className="text-[12.5px] font-medium">Blind re-rank</div>
              <div className="text-[12.5px] text-ink mt-1 leading-[1.5]">
                {blind ? (blind.delta_score < 1.0 ? `Names, emails, colleges and pronouns removed: scores move ${blind.delta_score} points on average, ranks ${blind.delta_blind}. Identity is not driving the ranking; rank swaps are between near-ties.` : `Names, emails, colleges and pronouns removed: scores move ${blind.delta_score} points on average, ranks ${blind.delta_blind}. Review the candidates that moved.`) : 'Strip names, emails, colleges and pronouns, then re-rank. Measures whether identity signals move anyone.'}
              </div>
              <div className="text-[11.5px] text-n6 mt-1.5 num">
                {blind ? (blind.ranks.filter((r) => Math.abs(r.score - r.score_blind) >= 1.0).slice(0, 6).map((r) => `${r.name.split(' ')[0]} ${r.score.toFixed(1)}→${r.score_blind.toFixed(1)}`).join(' · ') || 'no candidate moved by a full point') : <button onClick={runBlind} disabled={blindBusy} className="text-ink underline decoration-n3 underline-offset-2 hover:decoration-ink">{blindBusy ? 'running' : 'run'}</button>}
              </div>
            </div>
            {sorted.map((f) => {
              const measurable = impact(f) > 0
              const done = accepted[f.id] !== undefined
              return (
                <div key={f.id} className="pl-3 border-l-2" style={{ borderColor: measurable ? 'var(--azurite)' : 'var(--missing)' }}>
                  <div className="text-[12.5px] font-medium">{title(f)}</div>
                  <div className="text-[12.5px] text-ink mt-1 leading-[1.5]">{body(f, graph.candidates.length)}</div>
                  <div className="text-[11.5px] text-n6 mt-1.5 num">
                    {done ? 'accepted · board re-ranked' : f.replacement ? (
                      <>
                        <span className="text-n2">{'“'}{f.phrase}{'”'} → {'“'}{f.replacement}{'”'}</span>
                        <button onClick={() => accept(f)} disabled={busy === f.id} className="ml-2 text-ink underline decoration-n3 underline-offset-2 hover:decoration-ink">{busy === f.id ? 'applying' : 'accept'}</button>
                      </>
                    ) : f.rewrite}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function impact(f) {
  return (f.counterfactual?.movers?.length || 0) * 100 + (f.hard_filter?.rejects || 0)
}

function title(f) {
  return {
    experience_contradiction: 'Experience on an internship',
    age_proxy: 'Age-coded phrasing',
    gender_coded: 'Gender-coded phrasing',
    credential_inflation: 'Credential gate',
    culture_vagueness: 'Culture-fit phrasing',
    ability_coded: 'Ability-coded phrasing',
    over_specification: 'Over-specified',
  }[f.category] || f.label
}

function body(f, total) {
  const movers = f.counterfactual?.movers?.length || 0
  const rejects = f.hard_filter?.rejects || 0
  if (movers) return `Holds back ${movers} of ${total} candidates in this pool. A hard filter here would reject ${rejects}.`
  if (rejects) return `A hard filter on this phrase rejects ${rejects} of ${total}. Caliper penalises softly instead.`
  return 'No measurable pool effect. Legal exposure only.'
}
