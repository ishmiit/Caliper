import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, FileUp, FileText } from 'lucide-react'
import { api } from '../api'

export default function Upload({ onClose, onRun, defaultJD }) {
  const [jdFile, setJdFile] = useState(null)
  const [jdText, setJdText] = useState(defaultJD || '')
  const [files, setFiles] = useState([])
  const [drag, setDrag] = useState(false)

  const canRun = files.length > 0 || jdText.trim().length > 0
  const submit = () => {
    if (files.length > 0) onRun(() => api.upload(jdFile, jdFile ? null : jdText, files))
    else onRun(() => api.setJD(jdText))
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-center" onClick={onClose}>
      <motion.div initial={{ scale: 0.97, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.97, y: 10 }} onClick={(e) => e.stopPropagation()} className="w-[760px] card card-solid overflow-hidden" style={{ boxShadow: 'var(--shadow-lg)' }}>
        <div className="px-5 py-3.5 border-b border-line flex items-center">
          <div className="font-bold text-[15px]">New shortlisting run</div>
          <button onClick={onClose} className="ml-auto p-1 rounded hover:bg-surface-3 text-ink-3"><X size={16} /></button>
        </div>
        <div className="grid grid-cols-2 gap-4 p-5">
          <div>
            <div className="eyebrow mb-2">Job description</div>
            <label className="btn btn-ghost mb-2 w-full justify-center cursor-pointer">
              <FileText size={14} /> {jdFile ? jdFile.name : 'Upload JD PDF'}
              <input type="file" accept=".pdf,.txt" className="hidden" onChange={(e) => setJdFile(e.target.files[0] || null)} />
            </label>
            <textarea value={jdText} onChange={(e) => { setJdText(e.target.value); setJdFile(null) }} rows={13} placeholder="…or paste the JD text" className="w-full rounded-2xl bg-surface-2 p-3 text-[12px] font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-accent/40" />
          </div>
          <div>
            <div className="eyebrow mb-2">Resumes</div>
            <label onDragOver={(e) => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); setFiles([...e.dataTransfer.files].filter((f) => /\.(pdf|txt)$/i.test(f.name))) }}
              className={`h-[300px] rounded-2xl border-2 border-dashed grid place-items-center text-center cursor-pointer transition-colors ${drag ? 'border-accent bg-accent/10' : 'border-line hover:border-line bg-surface-2'}`}>
              <div>
                <FileUp className="mx-auto text-ink-3 mb-2" />
                <div className="font-semibold">{files.length ? `${files.length} file${files.length > 1 ? 's' : ''} selected` : 'Drop 15–18 resume PDFs here'}</div>
                <div className="text-[11.5px] text-ink-3 mt-1">{files.length ? files.slice(0, 4).map((f) => f.name).join(', ') + (files.length > 4 ? '…' : '') : 'or click to browse · PDF or TXT'}</div>
              </div>
              <input type="file" multiple accept=".pdf,.txt" className="hidden" onChange={(e) => setFiles([...e.target.files])} />
            </label>
            <div className="text-[11.5px] text-ink-3 mt-2">Leave empty to re-use the resumes in <span className="font-mono">data/resumes/</span>.</div>
          </div>
        </div>
        <div className="px-5 py-3 border-t border-line bg-surface-2 flex items-center gap-2">
          <span className="text-[11.5px] text-ink-3">Runs fully local · no candidate data leaves this machine</span>
          <button className="btn btn-ghost ml-auto" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={!canRun}>Run engine</button>
        </div>
      </motion.div>
    </motion.div>
  )
}
