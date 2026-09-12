import { motion } from 'framer-motion'

const TYPE = { hard_skill: 'Skill', soft_skill: 'Soft', responsibility: 'Duty', qualification: 'Qual', experience_level: 'Exp' }

export default function Requirements({ graph, focusReq, setFocusReq }) {
  const reqs = graph.requirements
  const must = reqs.filter((r) => r.priority === 'must_have')
  const nice = reqs.filter((r) => r.priority !== 'must_have')
  const coverage = (rid) => {
    const n = graph.candidates.length
    const hit = graph.candidates.filter((c) => ['CONFIRMED', 'STATED', 'INFERRED'].includes(c.per_requirement.find((p) => p.req_id === rid)?.verdict)).length
    return hit / n
  }
  return (
    <div className="card flex flex-col min-h-0 overflow-hidden">
      <div className="px-6 pt-5 pb-3">
        <div className="text-[17px] font-semibold tight">Requirements</div>
        <div className="text-[12px] text-ink-3 mt-0.5">{reqs.length} atomic · must-have weighs 3×</div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <Group title="Must-have" items={must} focusReq={focusReq} setFocusReq={setFocusReq} coverage={coverage} />
        <Group title="Nice-to-have" items={nice} focusReq={focusReq} setFocusReq={setFocusReq} coverage={coverage} />
      </div>
    </div>
  )
}

function Group({ title, items, focusReq, setFocusReq, coverage }) {
  if (!items.length) return null
  return (
    <div className="mb-3">
      <div className="eyebrow px-3 pt-2 pb-1.5">{title} · {items.length}</div>
      {items.map((r) => {
        const cov = coverage(r.req_id)
        const active = focusReq === r.req_id
        return (
          <motion.button layout key={r.req_id} onClick={() => setFocusReq(active ? null : r.req_id)} title={r.text}
            className={`w-full text-left rounded-2xl px-3 py-2 transition-colors ${active ? 'bg-ink text-canvas' : 'hover:bg-surface-2'}`}>
            <div className="flex items-center gap-2">
              <span className={`num text-[10.5px] font-semibold ${active ? 'opacity-60' : 'text-ink-3'}`}>{r.req_id}</span>
              <span className="font-medium text-[12.5px] truncate">{r.label}</span>
              <span className={`ml-auto text-[9.5px] font-semibold uppercase tracking-wider ${active ? 'opacity-60' : 'text-ink-3'}`}>{TYPE[r.type]}</span>
            </div>
            <div className={`mt-1.5 h-[3px] rounded-full overflow-hidden ${active ? 'bg-canvas/20' : 'bg-surface-3'}`}>
              <div className={`h-full rounded-full ${active ? 'bg-canvas' : cov < 0.34 ? 'bg-missing' : 'bg-confirmed'}`} style={{ width: `${cov * 100}%` }} />
            </div>
          </motion.button>
        )
      })}
    </div>
  )
}
