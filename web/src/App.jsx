import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './api'
import Chamber from './screens/Chamber'
import Analysis from './screens/Analysis'
import Console from './screens/Console'
import Redline from './screens/Redline'

const SCREENS = ['chamber', 'analysis', 'console', 'redline']

export default function App() {
  const [screen, setScreen] = useState('chamber')
  const [flash, setFlash] = useState(false)
  const [graph, setGraph] = useState(null)
  const [log, setLog] = useState(null)
  const [config, setConfig] = useState({ keyword_on: true, semantic_on: true })
  const [selected, setSelected] = useState(null)
  const [flags, setFlags] = useState(null)
  const prevRanks = useRef({})
  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

  const applyGraph = useCallback((g) => {
    setGraph((old) => {
      if (old) { const m = {}; for (const c of old.candidates) m[c.candidate_id] = c.rank; prevRanks.current = m }
      return g
    })
  }, [])

  const cut = useCallback(() => {
    if (reduced) { setScreen('console'); return }
    setFlash(true)
    setTimeout(() => { setFlash(false); setScreen('console') }, 60)
  }, [reduced])

  const run = useCallback(async (uploader) => {
    setLog(null); setSelected(null); setFlags(null); prevRanks.current = {}
    setScreen('analysis')
    try {
      const g = uploader ? await uploader() : await api.run()
      setLog(g.log)
      setGraph(g)
      setConfig({ keyword_on: true, semantic_on: true })
      setSelected(g.candidates[0]?.candidate_id ?? null)
    } catch (e) {
      setLog([{ step: 'engine unreachable', ms: 0, error: String(e.message || e) }])
    }
  }, [])

  const rerank = useCallback(async (next) => {
    const merged = { ...config, ...next }
    setConfig(merged)
    applyGraph(await api.rank(merged))
  }, [config, applyGraph])

  const applyFix = useCallback(async (flag) => {
    applyGraph(await api.applyFix(flag.id))
  }, [applyGraph])

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.key === 'Enter' && screen === 'chamber' && e.target.tagName !== 'BUTTON') { run(); return }
      const n = Number(e.key)
      if (n >= 1 && n <= 4) {
        const target = SCREENS[n - 1]
        if ((target === 'console' || target === 'redline') && !graph) return
        setScreen(target)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [graph, screen, run])

  return (
    <div className="h-full">
      {screen === 'chamber' && <Chamber onRun={run} />}
      {screen === 'analysis' && <Analysis log={log} graph={graph} onDone={cut} reduced={reduced} />}
      {screen === 'console' && graph && (
        <Console graph={graph} config={config} onToggle={rerank} selected={selected} setSelected={setSelected} prevRanks={prevRanks.current} onRedline={() => setScreen('redline')} onReset={() => setScreen('chamber')} />
      )}
      {screen === 'redline' && graph && (
        <Redline graph={graph} flags={flags} setFlags={setFlags} onApply={applyFix} selected={selected} setSelected={setSelected} prevRanks={prevRanks.current} onBack={() => setScreen('console')} config={config} onToggle={rerank} onReset={() => setScreen('chamber')} />
      )}
      {flash && <div className="fixed inset-0 z-50 bg-white" />}
      <DevControl screen={screen} setScreen={setScreen} enabled={!!graph} />
    </div>
  )
}

function DevControl({ screen, setScreen, enabled }) {
  const dark = screen === 'chamber' || screen === 'analysis'
  return (
    <div className={`fixed bottom-3 left-3 z-40 flex items-center gap-2 text-[11px] num ${dark ? 'text-[#3A3A36]' : 'text-n3'}`} aria-label="Screen control">
      {SCREENS.map((s, i) => (
        <button key={s} onClick={() => (i < 2 || enabled) && setScreen(s)} className={`px-1 ${screen === s ? (dark ? 'text-[#8C8C84]' : 'text-n2') : ''}`} title={s}>{i + 1}</button>
      ))}
    </div>
  )
}
