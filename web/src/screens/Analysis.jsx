import { useEffect, useMemo, useState } from 'react'

function shape(log, graph) {
  if (!log) return []
  const by = (needle) => log.find((l) => l.step.toLowerCase().startsWith(needle))
  const parsed = by('parsed'), headers = by('section'), chunks = by('evidence'), emb = by('embedded'), jd = by('jd'), scored = by('scored'), integ = by('integrity')
  const spread = graph ? (graph.candidates[0].final_score - graph.candidates.at(-1).final_score).toFixed(0) : null
  const rows = [
    ['parsing documents', parsed ? `${parsed.count} / ${parsed.count}` : null],
    ['section headers recovered', headers ? `${headers.headers}` : null],
    ['evidence chunks extracted', chunks ? `${chunks.chunks}` : null],
    ['embedding · local · 384d', emb ? (emb.ms < 30 ? 'cached' : `${(emb.ms / 1000).toFixed(2)}s`) : null],
    ['integrity pass', integ ? `${integ.flags} flags · ${integ.dups} duplicates` : null],
    ['requirements decomposed', jd ? `${jd.n_req}` : null],
    ['scoring pairs', scored ? `${scored.pairs}` : null],
    ['calibrating against cohort', spread ? `spread ${spread}` : null],
  ]
  if (log[0]?.error) return [['engine', log[0].error]]
  return rows
}

export default function Analysis({ log, graph, onDone, reduced }) {
  const rows = useMemo(() => shape(log, graph), [log, graph])
  const [shown, setShown] = useState(0)
  const ready = rows.length > 0 && !log?.[0]?.error

  useEffect(() => {
    if (!ready) return
    if (reduced) { setShown(rows.length); const t = setTimeout(onDone, 200); return () => clearTimeout(t) }
    let i = 0
    const id = setInterval(() => {
      i += 1; setShown(i)
      if (i >= rows.length) { clearInterval(id); setTimeout(onDone, 520) }
    }, 180)
    return () => clearInterval(id)
  }, [ready, rows.length, onDone, reduced])

  const pct = ready ? (shown / rows.length) * 100 : 12

  return (
    <div className="h-full bg-void text-bone flex flex-col px-8 pt-14 pb-8 md:px-16 md:pt-24 md:pb-12">
      <div className="marker text-[#8C8C84]">Reading</div>
      <div className="mt-8 max-w-[560px] space-y-[14px] text-[14px]">
        {(ready ? rows.slice(0, shown) : [['parsing documents', null]]).map(([label, value], i) => (
          <div key={i} className="flex items-baseline justify-between gap-6">
            <span className="text-[#8C8C84]">{label}</span>
            <span className="num font-medium text-bone">{value ?? <span className="text-[#585850]">—</span>}</span>
          </div>
        ))}
        {log?.[0]?.error && <div className="text-[#8C8C84] text-[12.5px] mt-4">Start the engine with <span className="text-bone">start.bat</span>, then press 1 and try again.</div>}
      </div>
      <div className="mt-auto">
        <div className="h-[2px] bg-[#2A2A26]"><div className="h-full bg-bone" style={{ width: `${pct}%`, transition: 'width 180ms linear' }} /></div>
        <div className="mt-3 text-[11.5px] text-[#585850]">no data leaves this machine</div>
      </div>
    </div>
  )
}
