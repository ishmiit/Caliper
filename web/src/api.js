const j = (r) => { if (!r.ok) throw new Error(r.statusText); return r.json() }

export const api = {
  run: () => fetch('/api/run', { method: 'POST' }).then(j),
  rank: (config) => fetch('/api/rank', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ config }) }).then(j),
  setJD: (jd_text) => fetch('/api/jd', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jd_text }) }).then(j),
  upload: (jdFile, jdText, files) => {
    const fd = new FormData()
    if (jdFile) fd.append('jd', jdFile)
    if (jdText) fd.append('jd_text', jdText)
    for (const f of files) fd.append('resumes', f)
    return fetch('/api/upload', { method: 'POST', body: fd }).then(j)
  },
  resume: (cid) => fetch(`/api/resume/${cid}`).then(j),
  compare: (a, b) => fetch(`/api/compare/${a}/${b}`).then(j),
  audit: () => fetch('/api/audit').then(j),
  applyFix: (id) => fetch(`/api/audit/apply/${id}`, { method: 'POST' }).then(j),
  ablation: () => fetch('/api/ablation').then(j),
  labels: (labels) => fetch('/api/labels', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ labels }) }).then(j),
  blind: () => fetch('/api/blind').then(j),
  chat: (message) => fetch('/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message }) }).then(j),
}

export const VERDICT_LABEL = { CONFIRMED: 'Confirmed', STATED: 'Stated', INFERRED: 'Inferred', WEAK: 'Weak', MISSING: 'Missing' }
export const VERDICT_HINT = {
  CONFIRMED: 'Keyword and meaning both match',
  STATED: 'Keyword present, context thin',
  INFERRED: 'Meaning matches, never named — credit capped',
  WEAK: 'Faint signal only',
  MISSING: 'No evidence found',
}
