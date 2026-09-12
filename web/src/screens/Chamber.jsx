import { useRef, useState } from 'react'
import { api } from '../api'

export default function Chamber({ onRun }) {
  const [drag, setDrag] = useState(false)
  const [files, setFiles] = useState([])
  const input = useRef(null)

  const accept = (list) => {
    const arr = [...list].filter((f) => /\.(pdf|txt)$/i.test(f.name))
    if (!arr.length) return
    setFiles(arr)
    const jd = arr.find((f) => /jd|job|brief|description/i.test(f.name))
    const resumes = arr.filter((f) => f !== jd)
    onRun(() => api.upload(jd || null, null, resumes.length ? resumes : arr))
  }

  return (
    <div className="h-full bg-void text-bone flex flex-col px-8 pt-14 pb-8 md:px-16 md:pt-24 md:pb-12">
      <h1 className="display text-[34px] md:text-[42px] max-w-[520px]">
        Eleven thousand applications a minute.{' '}
        <span className="text-[#585850]">Nobody can explain one of them.</span>
      </h1>

      <div className="mt-auto flex items-end gap-6">
        <button
          onClick={() => input.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); accept(e.dataTransfer.files) }}
          className={`flex-1 h-[128px] md:h-[150px] border border-dashed text-left px-6 flex items-end pb-5 transition-colors ${drag ? 'border-bone' : 'border-[#4A4A44]'}`}
          aria-label="Drop the brief and the pool"
        >
          <div>
            <div className="text-[13px] text-[#8C8C84]">Drop the brief and the pool</div>
            <div className="text-[11.5px] text-[#585850] mt-1">
              {files.length ? `${files.length} files` : 'or press enter to run the sample pool'}
            </div>
          </div>
          <input ref={input} type="file" multiple accept=".pdf,.txt" className="hidden" onChange={(e) => accept(e.target.files)} />
        </button>
        <button onClick={() => onRun()} onKeyDown={(e) => e.key === 'Enter' && onRun()} className="wordmark text-[#585850] pb-5 hover:text-[#8C8C84]" aria-label="Run the sample pool">Caliper</button>
      </div>
    </div>
  )
}
