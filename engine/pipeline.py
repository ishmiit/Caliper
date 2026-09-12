import json
import time
from pathlib import Path

import numpy as np

from engine import audit as audit_mod
from engine.evaluate import evaluate
from engine.explain import explain_candidate, compare
from engine.fusion import build_graph, DEFAULT_CONFIG
from engine.ingest import load_resumes, parse_resume
from engine import integrity
from engine.jd_graph import decompose
from engine.lexical import BM25, lexical_channel
from engine.ontology import Ontology
from engine.semantic import embed, semantic_channel

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"


def default_pool():
    for name in ("judged", "resumes"):
        p = DATA / name
        if p.exists() and any(p.iterdir()):
            return p
    return DATA / "resumes"


class Session:
    def __init__(self):
        self.onto = Ontology(DATA / "skill_ontology.json")
        self.lexicon = audit_mod.load_lexicon(DATA / "bias_lexicon.json")
        self.resumes = []
        self.chunk_vecs = {}
        self.jd_text = ""
        self.jd_title = ""
        self.requirements = []
        self.req_vecs = None
        self.bm25 = None
        self.lex = None
        self.sem_raw = None
        self.sem_ev = None
        self.graph = None
        self.log = []
        self.labels = self._load_labels()
        self.cfg = dict(DEFAULT_CONFIG)

    def _load_labels(self):
        p = DATA / "labels.json"
        return json.loads(p.read_text()) if p.exists() else {}

    def save_labels(self, labels):
        self.labels = {k: int(v) for k, v in labels.items() if v}
        (DATA / "labels.json").write_text(json.dumps(self.labels, indent=2))

    def _step(self, msg, t0, extra=None):
        self.log.append({"step": msg, "ms": int((time.perf_counter() - t0) * 1000), **(extra or {})})

    def ingest(self, jd_text, resume_folder: Path = None, resume_paths=None):
        self.log = []
        self.cfg = dict(DEFAULT_CONFIG)
        T = time.perf_counter()
        t = time.perf_counter()
        if resume_paths is not None:
            self.resumes = [parse_resume(Path(p), f"r{i+1:02d}") for i, p in enumerate(resume_paths)]
        else:
            self.resumes = load_resumes(resume_folder or default_pool())
        n_chunks = sum(len(r.chunks) for r in self.resumes)
        fuzzy = sum(r.fuzzy_headers for r in self.resumes)
        headers = sum(len(r.sections) for r in self.resumes)
        methods = {}
        for r in self.resumes:
            methods[r.parse_method] = methods.get(r.parse_method, 0) + 1
        self._step(f"Parsed {len(self.resumes)} documents", t, {"count": len(self.resumes), "methods": methods})
        self._step(f"Section headers recovered: {headers} ({fuzzy} fuzzy-matched)", t, {"headers": headers, "fuzzy": fuzzy})
        self._step(f"Evidence chunks extracted: {n_chunks}", t, {"chunks": n_chunks})

        t = time.perf_counter()
        self.bm25 = BM25([r.raw_text for r in self.resumes])
        self._step(f"BM25 index built: vocab {self.bm25.vocab:,} terms, avgdl {self.bm25.avgdl:.0f}", t, {"vocab": self.bm25.vocab})

        t = time.perf_counter()
        for r in self.resumes:
            if r.resume_id not in self.chunk_vecs or self.chunk_vecs[r.resume_id].shape[0] != len(r.chunks):
                self.chunk_vecs[r.resume_id] = embed([c.text for c in r.chunks])
        self._step(f"Embedded {n_chunks} chunks · 384-dim · local MiniLM", t, {"chunks": n_chunks, "dim": 384})

        t = time.perf_counter()
        dups = integrity.duplicate_clusters(self.resumes, self.chunk_vecs)
        n_flags = 0
        for r in self.resumes:
            r.duplicates = dups.get(r.resume_id, [])
            r.integrity = integrity.check(r, r.hidden_chars, r.injected, self.onto)
            n_flags += len(r.integrity)
        self._step(f"Integrity pass: {n_flags} flags · {len(dups)} near-duplicates", t, {"flags": n_flags, "dups": len(dups)})

        self.set_jd(jd_text)
        self._step("Done", T)
        return self.log

    def set_jd(self, jd_text):
        t = time.perf_counter()
        self.jd_text = jd_text
        d = decompose(jd_text, self.onto, self.cfg["w_must"], self.cfg["w_nice"])
        self.jd_title = d["title"]
        self.requirements = d["requirements"]
        n_must = sum(1 for r in self.requirements if r.priority == "must_have")
        self.req_vecs = embed([r.text for r in self.requirements])
        self._step(f"JD decomposed: {len(self.requirements)} requirements ({n_must} must / {len(self.requirements) - n_must} nice)", t, {"n_req": len(self.requirements), "must": n_must})
        t = time.perf_counter()
        self._compute_channels()
        self._step(f"Scored {len(self.requirements) * len(self.resumes)} requirement × candidate pairs", t, {"pairs": len(self.requirements) * len(self.resumes)})

    def _compute_channels(self):
        R, C = len(self.requirements), len(self.resumes)
        self.lex = [[None] * C for _ in range(R)]
        self.sem_raw = [[0.0] * C for _ in range(R)]
        self.sem_ev = [[[] for _ in range(C)] for _ in range(R)]
        for ri, req in enumerate(self.requirements):
            raw_bm = self.bm25.scores(" ".join(req.terms) + " " + req.text if req.terms else req.text)
            lo, hi = min(raw_bm), max(raw_bm)
            for ci, res in enumerate(self.resumes):
                bm_norm = (raw_bm[ci] - lo) / (hi - lo + 1e-9) if hi > lo else 0.0
                self.lex[ri][ci] = lexical_channel(req, res, self.onto, bm_norm)
                s = semantic_channel(self.req_vecs[ri], res, self.chunk_vecs[res.resume_id])
                self.sem_raw[ri][ci] = s["raw"]
                self.sem_ev[ri][ci] = s["evidence"]

    def rank(self, cfg=None):
        t = time.perf_counter()
        merged = {**self.cfg, **(cfg or {})}
        if merged["w_must"] != self.cfg["w_must"] or merged["w_nice"] != self.cfg["w_nice"]:
            for r in self.requirements:
                r.weight = merged["w_must"] if r.priority == "must_have" else merged["w_nice"]
        self.cfg = merged
        self.graph = build_graph(self.requirements, self.resumes, self.lex, self.sem_raw, self.sem_ev, merged)
        for c in self.graph["candidates"]:
            c["explanation"] = explain_candidate(c, self.graph["requirements"])
        self.graph["jd_title"] = self.jd_title
        self.graph["jd_text"] = self.jd_text
        self.graph["log"] = self.log
        self.graph["metrics"] = self.metrics()
        self.graph["timing_ms"] = int((time.perf_counter() - t) * 1000)
        return self.graph

    def metrics(self):
        if not self.labels or not self.graph:
            return None
        return evaluate(self.graph, self.labels)

    def ablation(self):
        if not self.labels:
            return None
        base = dict(self.cfg)
        rows = []
        for name, over in [
            ("Keyword only", {"semantic_on": False}),
            ("Semantic only", {"keyword_on": False}),
            ("Fused (Caliper)", {}),
            ("Fused − ontology", {"ontology_on": False}),
            ("Fused − calibration", {"calibrate_on": False}),
        ]:
            g = build_graph(self.requirements, self.resumes, self.lex, self.sem_raw, self.sem_ev, {**base, "keyword_on": True, "semantic_on": True, "ontology_on": True, "calibrate_on": True, **over})
            m = evaluate(g, self.labels)
            scores = [c["final_score"] for c in g["candidates"]]
            rows.append({"config": name, **m, "spread": round(max(scores) - min(scores), 1)})
        return rows

    def explain(self, cid):
        c = next((c for c in self.graph["candidates"] if c["candidate_id"] == cid), None)
        return c["explanation"] if c else None

    def compare(self, a_id, b_id):
        cs = {c["candidate_id"]: c for c in self.graph["candidates"]}
        return compare(cs[a_id], cs[b_id], self.graph["requirements"])

    def resume_lines(self, cid):
        r = next((r for r in self.resumes if r.resume_id == cid), None)
        if not r:
            return None
        return {"candidate_id": cid, "name": r.name, "lines": r.lines, "sections": r.sections, "parse_method": r.parse_method, "parse_confidence": r.parse_confidence, "fuzzy_headers": r.fuzzy_headers, "chunks": [{"chunk_id": c.chunk_id, "line": c.line_no, "section": c.section, "text": c.text} for c in r.chunks]}

    def audit(self, top_n=8):
        n_hard = sum(1 for r in self.requirements if r.type == "hard_skill" and r.priority == "must_have")
        flags = audit_mod.find_flags(self.jd_text, self.lexicon, n_hard)
        base_top = [c["candidate_id"] for c in self.graph["candidates"][:top_n]]
        base_rank = {c["candidate_id"]: c["rank"] for c in self.graph["candidates"]}
        saved = (self.jd_text, self.jd_title, self.requirements, self.req_vecs, self.lex, self.sem_raw, self.sem_ev, list(self.log))
        for f in flags:
            touched = [r for r in self.requirements if f["phrase"].lower() in r.text.lower() and r.priority == "must_have"]
            if touched:
                rejects = []
                for c in self.graph["candidates"]:
                    if any(next(p for p in c["per_requirement"] if p["req_id"] == r.req_id)["verdict"] in ("MISSING", "WEAK") for r in touched):
                        rejects.append({"candidate_id": c["candidate_id"], "name": c["name"], "rank": c["rank"]})
                f["hard_filter"] = {"req_ids": [r.req_id for r in touched], "rejects": len(rejects), "total": len(self.graph["candidates"]), "top_rejects": [x for x in rejects if x["rank"] <= top_n]}
            else:
                f["hard_filter"] = None
            new_jd = audit_mod.apply_fix(self.jd_text, f)
            if new_jd == self.jd_text:
                f["counterfactual"] = None
                continue
            self.set_jd(new_jd)
            g = build_graph(self.requirements, self.resumes, self.lex, self.sem_raw, self.sem_ev, self.cfg)
            new_top = [c["candidate_id"] for c in g["candidates"][:top_n]]
            entered = [c for c in new_top if c not in base_top]
            movers = [{"candidate_id": c["candidate_id"], "name": c["name"], "from": base_rank[c["candidate_id"]], "to": c["rank"]} for c in g["candidates"] if base_rank[c["candidate_id"]] - c["rank"] >= 1]
            f["counterfactual"] = {"entered_top_n": len(entered), "top_n": top_n, "movers": sorted(movers, key=lambda m: m["from"] - m["to"], reverse=True)[:6], "new_jd": new_jd}
            self.jd_text, self.jd_title, self.requirements, self.req_vecs, self.lex, self.sem_raw, self.sem_ev, self.log = saved
        return flags

    def apply_fix(self, flag_id):
        n_hard = sum(1 for r in self.requirements if r.type == "hard_skill" and r.priority == "must_have")
        flags = audit_mod.find_flags(self.jd_text, self.lexicon, n_hard)
        f = next((x for x in flags if x["id"] == flag_id), None)
        if not f:
            return None
        self.set_jd(audit_mod.apply_fix(self.jd_text, f))
        return self.rank()

    def blind(self):
        saved_resumes = self.resumes
        saved_vecs = self.chunk_vecs
        base = self.graph
        import copy
        blind_resumes = []
        for r in saved_resumes:
            rb = copy.copy(r)
            rb.chunks = [copy.copy(c) for c in r.chunks]
            for c in rb.chunks:
                c.text = _strip(c.text, r.name)
            blind_resumes.append(rb)
        self.resumes = blind_resumes
        self.chunk_vecs = {r.resume_id: embed([c.text for c in r.chunks]) for r in blind_resumes}
        self.bm25 = BM25([_strip(r.raw_text, r.name) for r in blind_resumes])
        self._compute_channels()
        g = build_graph(self.requirements, self.resumes, self.lex, self.sem_raw, self.sem_ev, self.cfg)
        delta = audit_mod.blind_delta(base, g)
        blind_by = {x["candidate_id"]: x for x in g["candidates"]}
        score_delta = round(sum(abs(c["final_score"] - blind_by[c["candidate_id"]]["final_score"]) for c in base["candidates"]) / max(1, len(base["candidates"])), 2)
        self.resumes, self.chunk_vecs = saved_resumes, saved_vecs
        self.bm25 = BM25([r.raw_text for r in self.resumes])
        self._compute_channels()
        return {"delta_blind": delta, "delta_score": score_delta, "ranks": [{"candidate_id": c["candidate_id"], "name": c["name"], "rank": c["rank"], "rank_blind": blind_by[c["candidate_id"]]["rank"], "score": c["final_score"], "score_blind": blind_by[c["candidate_id"]]["final_score"]} for c in base["candidates"]]}

    def reverse(self, cid):
        """Same graph transposed: how this candidate fits each requirement cluster — the student-side view."""
        c = next((c for c in self.graph["candidates"] if c["candidate_id"] == cid), None)
        return c


def _strip(text, name):
    from engine.ingest import strip_pii
    return strip_pii(text, name)
