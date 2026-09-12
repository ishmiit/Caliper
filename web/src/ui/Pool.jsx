import { motion } from 'framer-motion'

const spring = { type: 'spring', stiffness: 350, damping: 30 }

function short(name) {
  const parts = name.trim().split(/\s+/)
  return parts.length > 1 ? `${parts[0]} ${parts.at(-1)[0]}.` : name
}

function tone(i, n) {
  if (i < 3) return 'var(--ink)'
  const t = (i - 3) / Math.max(1, n - 4)
  return t < 0.5 ? 'var(--n2)' : 'var(--n5)'
}

export default function Pool({ graph, selected, setSelected, prevRanks, compact = false }) {
  const cands = graph.candidates
  return (
    <div className="flex flex-col min-h-0">
      <div className="marker text-n2 px-4 pt-4 pb-3 border-b hairline">Pool</div>
      <div className="flex-1 overflow-y-auto" role="listbox" aria-label="Ranked candidates">
        {cands.map((c, i) => {
          const sel = c.candidate_id === selected
          const prev = prevRanks?.[c.candidate_id]
          const delta = prev ? prev - c.rank : 0
          const gem = c.hidden_gem
          return (
            <motion.button layout transition={spring} key={c.candidate_id} role="option" aria-selected={sel}
              onClick={() => setSelected(c.candidate_id)}
              className={`w-full text-left px-4 py-[9px] flex items-baseline gap-3 ${gem ? 'bg-ink text-bone' : ''} ${sel && !gem ? 'bg-n4' : ''}`}
              style={{ color: gem ? 'var(--bone)' : tone(i, cands.length) }}>
              <span className={`num text-[11.5px] w-5 shrink-0 ${gem ? 'text-[#8C8879]' : 'text-n2'}`}>{String(c.rank).padStart(2, '0')}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium truncate">{short(c.name)}</span>
                {gem && <span className="block num text-[10.5px] tracking-[0.04em] text-[#C9C4B7] mt-0.5">GEM ↑{c.keyword_delta}</span>}
              </span>
              {!gem && delta !== 0 && <span className={`num text-[10.5px] shrink-0 ${delta > 0 ? 'text-ink' : 'text-n2'}`}>{delta > 0 ? '↑' : '↓'}{Math.abs(delta)}</span>}
              <span className="num text-[13px] font-medium shrink-0 w-8 text-right">{Math.round(c.final_score)}</span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
