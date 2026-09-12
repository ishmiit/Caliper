import { useState } from 'react'
import { motion } from 'framer-motion'

const V = { CONFIRMED: 'var(--confirmed)', STATED: 'var(--stated)', INFERRED: 'var(--inferred)', WEAK: 'var(--weak)', MISSING: 'var(--missing)' }

export default function FusionMap({ cand, reqById, cfg, focusReq, setFocusReq, size = 200 }) {
  const [hover, setHover] = useState(null)
  const pad = 22
  const w = size, h = size
  const tl = cfg?.tau_lex ?? 0.35, ts = cfg?.tau_sem ?? 0.55
  const X = (v) => pad + v * (w - pad - 8)
  const Y = (v) => h - pad - v * (h - pad - 14)
  const rows = cand.per_requirement
  const hov = hover ? rows.find((p) => p.req_id === hover) : null

  return (
    <div className="relative">
      <svg width={w} height={h} className="block select-none">
        <defs>
          <linearGradient id="fq" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="var(--confirmed)" stopOpacity=".18" /><stop offset="1" stopColor="var(--confirmed)" stopOpacity=".04" /></linearGradient>
        </defs>
        <rect x={X(tl)} y={Y(1)} width={X(1) - X(tl)} height={Y(ts) - Y(1)} fill="url(#fq)" rx="6" />
        <line x1={X(tl)} x2={X(tl)} y1={Y(0)} y2={Y(1)} stroke="var(--line)" strokeDasharray="3 3" />
        <line x1={X(0)} x2={X(1)} y1={Y(ts)} y2={Y(ts)} stroke="var(--line)" strokeDasharray="3 3" />
        <line x1={X(0)} x2={X(1)} y1={Y(0)} y2={Y(0)} stroke="var(--line)" />
        <line x1={X(0)} x2={X(0)} y1={Y(0)} y2={Y(1)} stroke="var(--line)" />
        <text x={X(1)} y={Y(0) + 14} textAnchor="end" fontSize="9" fill="var(--ink-3)" fontWeight="600" letterSpacing=".08em">KEYWORD →</text>
        <text x={X(0) - 6} y={Y(1) + 4} textAnchor="end" fontSize="9" fill="var(--ink-3)" fontWeight="600" letterSpacing=".08em" transform={`rotate(-90 ${X(0) - 6} ${Y(1) + 4})`}>SEMANTIC →</text>
        <text x={X(1) - 4} y={Y(1) - 4} textAnchor="end" fontSize="8.5" fill="var(--confirmed)" fontWeight="700" opacity=".9">CONFIRMED</text>
        <text x={X(0) + 4} y={Y(1) - 4} fontSize="8.5" fill="var(--inferred)" fontWeight="700" opacity=".9">INFERRED</text>
        <text x={X(1) - 4} y={Y(ts) + 11} textAnchor="end" fontSize="8.5" fill="var(--stated)" fontWeight="700" opacity=".9">STATED</text>
        <text x={X(0) + 4} y={Y(ts) + 11} fontSize="8.5" fill="var(--missing)" fontWeight="700" opacity=".9">MISSING</text>
        {rows.map((p, i) => {
          const r = reqById[p.req_id]
          const must = r?.priority === 'must_have'
          const dim = (focusReq && focusReq !== p.req_id) || (hover && hover !== p.req_id)
          return (
            <motion.g key={p.req_id} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: dim ? 0.25 : 1, scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 22, delay: 0.03 * i }} style={{ transformOrigin: `${X(p.lex)}px ${Y(p.sem)}px` }}
              onMouseEnter={() => setHover(p.req_id)} onMouseLeave={() => setHover(null)} onClick={() => setFocusReq?.(focusReq === p.req_id ? null : p.req_id)} className="cursor-pointer">
              <circle cx={X(p.lex)} cy={Y(p.sem)} r={must ? 5.5 : 4} fill={V[p.verdict]} fillOpacity={0.9} stroke="var(--surface-solid)" strokeWidth="1.5" />
              {must && <circle cx={X(p.lex)} cy={Y(p.sem)} r={8.5} fill="none" stroke={V[p.verdict]} strokeOpacity=".35" />}
            </motion.g>
          )
        })}
      </svg>
      {hov && (
        <div className="absolute left-0 right-0 -bottom-1 translate-y-full text-[11px] text-ink-2 leading-snug">
          <span className="num text-ink-3 mr-1.5">{hov.req_id}</span><span className="font-medium text-ink">{reqById[hov.req_id]?.label}</span>
          <span className="ml-2 num">kw {hov.lex.toFixed(2)} · sem {hov.sem.toFixed(2)}</span>
        </div>
      )}
    </div>
  )
}
