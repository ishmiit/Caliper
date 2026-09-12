import { useEffect, useRef, useState } from 'react'

export default function CountUp({ value, decimals = 2, duration = 500 }) {
  const [v, setV] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    if (value === null || value === undefined) return
    const start = performance.now(), a = from.current ?? value, b = value
    let raf
    const tick = (t) => {
      const p = Math.min(1, (t - start) / duration), e = 1 - Math.pow(1 - p, 3)
      setV(a + (b - a) * e)
      if (p < 1) raf = requestAnimationFrame(tick); else from.current = b
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])
  if (value === null || value === undefined) return <span>—</span>
  return <span className="num">{Number(v).toFixed(decimals)}</span>
}
