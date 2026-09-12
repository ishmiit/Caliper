import { useEffect, useRef, useState } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'framer-motion'

export function Ambient() {
  useEffect(() => {
    const onMove = (e) => {
      const el = e.target.closest?.('.card')
      if (!el) return
      const r = el.getBoundingClientRect()
      el.style.setProperty('--mx', `${e.clientX - r.left}px`)
      el.style.setProperty('--my', `${e.clientY - r.top}px`)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [])
  return (
    <>
      <div className="aurora" aria-hidden><span /><span /><span /></div>
      <div className="grain" aria-hidden />
    </>
  )
}

export function CountUp({ value, decimals = 1, className = '', duration = 0.9 }) {
  const mv = useMotionValue(value)
  const text = useTransform(mv, (v) => v.toFixed(decimals))
  const first = useRef(true)
  useEffect(() => {
    const from = first.current ? Math.max(0, value - 25) : mv.get()
    first.current = false
    const c = animate(mv, value, { duration, ease: [0.22, 1, 0.36, 1] })
    return c.stop
  }, [value]) // eslint-disable-line
  return <motion.span className={className}>{text}</motion.span>
}

export function useTyped(text, speed = 14) {
  const [out, setOut] = useState('')
  useEffect(() => {
    setOut('')
    if (!text) return
    let i = 0
    const id = setInterval(() => { i += 2; setOut(text.slice(0, i)); if (i >= text.length) clearInterval(id) }, speed)
    return () => clearInterval(id)
  }, [text, speed])
  return out
}

export const view = {
  initial: { opacity: 0, y: 10, scale: 0.995, filter: 'blur(6px)' },
  animate: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -8, scale: 0.995, filter: 'blur(6px)', transition: { duration: 0.22 } },
}
