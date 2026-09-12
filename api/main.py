import re
import shutil
import threading
import tempfile
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from engine.pipeline import Session, DATA
from engine.ingest import extract_text
from engine.semantic import get_model

app = FastAPI(title="Caliper")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
session = Session()
LOCK = threading.Lock()


@app.on_event("startup")
def warm():
    get_model()


def default_jd():
    for name in ("Sample_JD.pdf", "Sample_JD.txt"):
        p = DATA / name
        if p.exists():
            return extract_text(p)[0]
    return ""


@app.get("/api/health")
def health():
    return {"ok": True, "resumes": len(session.resumes), "requirements": len(session.requirements)}


@app.get("/api/jd")
def jd():
    return {"jd_text": session.jd_text or default_jd()}


@app.post("/api/run")
def run(jd_text: Optional[str] = None):
    with LOCK:
        text = jd_text or session.jd_text or default_jd()
        session.ingest(text)
        return session.rank()


class RankBody(BaseModel):
    config: dict = {}


@app.post("/api/rank")
def rank(body: RankBody):
    with LOCK:
        if not session.resumes:
            session.ingest(default_jd())
        return session.rank(body.config)


class JDBody(BaseModel):
    jd_text: str


@app.post("/api/jd")
def set_jd(body: JDBody):
    with LOCK:
        if not session.resumes:
            session.ingest(body.jd_text)
        else:
            session.set_jd(body.jd_text)
        return session.rank()


@app.post("/api/upload")
async def upload(jd: Optional[UploadFile] = File(None), jd_text: Optional[str] = Form(None), resumes: list[UploadFile] = File(...)):
    tmp = Path(tempfile.mkdtemp(prefix="caliper_"))
    paths = []
    for f in resumes:
        p = tmp / re.sub(r"[^\w.\-]", "_", f.filename)
        p.write_bytes(await f.read())
        paths.append(p)
    text = jd_text
    if jd is not None:
        jp = tmp / re.sub(r"[^\w.\-]", "_", jd.filename)
        jp.write_bytes(await jd.read())
        text = extract_text(jp)[0]
    with LOCK:
        session.ingest(text or default_jd(), resume_paths=paths)
        return session.rank()


@app.get("/api/resume/{cid}")
def resume(cid: str):
    return session.resume_lines(cid)


@app.get("/api/compare/{a}/{b}")
def compare(a: str, b: str):
    return session.compare(a, b)


@app.get("/api/audit")
def audit():
    with LOCK:
        return {"flags": session.audit()}


@app.post("/api/audit/apply/{flag_id}")
def apply_fix(flag_id: str):
    with LOCK:
        return session.apply_fix(flag_id)


@app.get("/api/ablation")
def ablation():
    with LOCK:
        return {"rows": session.ablation(), "labels": session.labels}


class LabelsBody(BaseModel):
    labels: dict


@app.post("/api/labels")
def labels(body: LabelsBody):
    with LOCK:
        session.save_labels(body.labels)
        session.rank()
        return {"rows": session.ablation(), "labels": session.labels, "metrics": session.metrics()}


@app.get("/api/blind")
def blind():
    with LOCK:
        return session.blind()


class ChatBody(BaseModel):
    message: str


@app.post("/api/chat")
def chat(body: ChatBody):
    return answer(body.message)


def answer(msg: str):
    g = session.graph
    if not g:
        return {"text": "Run a ranking first.", "citations": []}
    low = msg.lower()
    cands = g["candidates"]
    reqs = g["requirements"]
    by_first = {}
    for c in cands:
        for part in c["name"].lower().split():
            by_first.setdefault(part, c)
    mentioned = []
    for tok in re.findall(r"[a-z]+", low):
        c = by_first.get(tok)
        if c and c not in mentioned:
            mentioned.append(c)
    for m in re.finditer(r"#?(\d{1,2})\b", low):
        n = int(m.group(1))
        c = next((x for x in cands if x["rank"] == n), None)
        if c and c not in mentioned and ("rank" in low or "#" in low or "candidate" in low):
            mentioned.append(c)

    if len(mentioned) >= 2 and any(w in low for w in ("above", "over", "vs", "versus", "compare", "than", "better", "instead")):
        a, b = mentioned[0], mentioned[1]
        if a["rank"] > b["rank"]:
            a, b = b, a
        cmp = session.compare(a["candidate_id"], b["candidate_id"])
        cites = [{"candidate_id": a["candidate_id"], "req_id": d["req_id"], "line": (d["a"]["evidence"][0]["line"] if d["a"]["evidence"] else None)} for d in cmp["deltas"][:3]]
        return {"text": cmp["text"], "citations": cites, "compare": [a["candidate_id"], b["candidate_id"]]}

    if any(w in low for w in ("hidden gem", "gems", "outside the top", "missed", "overlooked", "keyword would")):
        gems = [c for c in cands if c["hidden_gem"]]
        if not gems:
            return {"text": "No candidate moves more than 5 places between the keyword-only ranking and the fused ranking in this pool.", "citations": []}
        parts = [f"{c['name']} is #{c['rank']} with us but #{c['rank_keyword_only']} on keywords alone (score {c['final_score']})" for c in gems]
        return {"text": "Hidden gems — candidates a keyword ATS would under-rank: " + "; ".join(parts) + ".", "citations": [{"candidate_id": c["candidate_id"]} for c in gems]}

    req_hit = None
    for r in reqs:
        for t in r.get("terms", []):
            if t in low or r["label"].lower() in low:
                req_hit = r
                break
        if req_hit:
            break
    if req_hit:
        if any(w in low for w in ("missing", "lack", "without", "doesn't", "does not", "no ")):
            rows = [(c, next(p for p in c["per_requirement"] if p["req_id"] == req_hit["req_id"])) for c in cands]
            miss = [c["name"] for c, p in rows if p["verdict"] in ("MISSING", "WEAK")]
            return {"text": f"{len(miss)} of {len(cands)} candidates have no evidence for {req_hit['req_id']} ({req_hit['label']}): " + (", ".join(miss) if miss else "none") + ".", "citations": [{"req_id": req_hit["req_id"]}]}
        rows = [(c, next(p for p in c["per_requirement"] if p["req_id"] == req_hit["req_id"])) for c in cands]
        have = [(c, p) for c, p in rows if p["verdict"] in ("CONFIRMED", "STATED", "INFERRED")]
        have.sort(key=lambda x: -x[1]["fit"])
        parts = [f"{c['name']} ({p['verdict'].lower()}" + (f", line {p['evidence'][0]['line']+1}" if p["evidence"] else "") + ")" for c, p in have[:8]]
        return {"text": f"{len(have)} candidates show evidence for {req_hit['req_id']} ({req_hit['label']}): " + ", ".join(parts) + ".", "citations": [{"candidate_id": c["candidate_id"], "req_id": req_hit["req_id"], "line": (p["evidence"][0]["line"] if p["evidence"] else None)} for c, p in have[:5]]}

    if len(mentioned) == 1 or any(w in low for w in ("why", "explain")):
        c = mentioned[0] if mentioned else cands[0]
        e = c["explanation"]
        return {"text": f"{c['name']}: {e['summary']}", "citations": [{"candidate_id": c["candidate_id"], "req_id": s["req_id"], "line": s["line"]} for s in e["strengths"][:3]]}

    if any(w in low for w in ("top", "best", "shortlist")):
        parts = [f"#{c['rank']} {c['name']} ({c['final_score']})" for c in cands[:5]]
        return {"text": "Current shortlist: " + ", ".join(parts) + ".", "citations": [{"candidate_id": c["candidate_id"]} for c in cands[:5]]}

    return {"text": "I can answer: 'Why is X above Y?', 'Who has Docker?', 'Who is missing React?', 'Show hidden gems', or 'Why is Priya ranked there?'. Every answer cites requirement IDs and resume lines from the evidence graph.", "citations": []}
