import CountUp from './CountUp'

export default function Bar({ graph, config, onToggle, right, onReset }) {
  const m = graph?.metrics
  const spread = graph ? graph.candidates[0].final_score - graph.candidates.at(-1).final_score : null
  return (
    <div className="h-12 shrink-0 border-b hairline flex items-center px-4 md:px-6 gap-4 md:gap-6 whitespace-nowrap">
      <button onClick={onReset} className="wordmark text-ink" aria-label="Back to start">Caliper</button>
      {graph && <span className="hidden md:inline text-[12.5px] text-n2 truncate">{graph.jd_title}</span>}
      <div className="ml-auto flex items-center gap-3 md:gap-5">
        <Toggle label="keyword" on={config.keyword_on} onChange={(v) => onToggle({ keyword_on: v })} />
        <Toggle label="semantic" on={config.semantic_on} onChange={(v) => onToggle({ semantic_on: v })} />
        <span className="text-[12.5px] text-ink">
          {m ? <>nDCG <CountUp value={m.ndcg5} /></> : <>spread <CountUp value={spread} decimals={0} /></>}
        </span>
        {right}
      </div>
    </div>
  )
}

function Toggle({ label, on, onChange }) {
  return (
    <button role="switch" aria-checked={on} onClick={() => onChange(!on)} className="flex items-center gap-2 text-[12.5px]">
      <span className={`w-[22px] h-[12px] border relative ${on ? 'border-ink bg-ink' : 'border-n2'}`}>
        <span className={`absolute top-[1px] w-[8px] h-[8px] ${on ? 'right-[1px] bg-bone' : 'left-[1px] bg-n2'}`} />
      </span>
      <span className={on ? 'text-ink' : 'text-n2'}>{label}<span className="hidden md:inline"> {on ? 'on' : 'off'}</span></span>
    </button>
  )
}
