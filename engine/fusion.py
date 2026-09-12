import math
import numpy as np

DEFAULT_CONFIG = {
    "keyword_on": True,
    "semantic_on": True,
    "ontology_on": True,
    "calibrate_on": True,
    "alpha_inferred": 0.65,
    "tau_lex": 0.35,
    "tau_sem": 0.55,
    "w_must": 3.0,
    "w_nice": 1.0,
    "coverage_floor": 0.40,
    "max_penalty": 0.15,
}


def sigmoid(x):
    return 1 / (1 + math.exp(-x))


def calibrate(raw_row, on=True):
    """Cohort percentile calibration: blends percentile rank with a z-score sigmoid so scores spread instead of clustering 0.3-0.6."""
    arr = np.array(raw_row, dtype=np.float64)
    if not on:
        return np.clip((arr - 0.15) / 0.55, 0, 1).tolist()
    n = len(arr)
    if n < 2:
        return arr.tolist()
    ranks = arr.argsort().argsort()
    pct = ranks / max(1, n - 1)
    mu, sd = arr.mean(), arr.std() + 1e-6
    z = (arr - mu) / sd
    return [float(np.clip(0.6 * p + 0.4 * sigmoid(zz), 0, 1)) for p, zz in zip(pct, z)]


def fuse_pair(req, L, S, cfg, months=0):
    tl, ts, alpha = cfg["tau_lex"], cfg["tau_sem"], cfg["alpha_inferred"]
    if req.type == "experience_level" and getattr(req, "years", 0) > 0:
        ratio = min(1.0, months / (req.years * 12))
        if ratio >= 1.0:
            return "CONFIRMED", 1.0
        if ratio >= 0.15:
            return "WEAK", round(ratio, 3)
        return "MISSING", 0.0
    lex_ok, sem_ok = L >= tl, S >= ts
    if lex_ok and sem_ok:
        return "CONFIRMED", max(L, S)
    if lex_ok and not sem_ok:
        return "STATED", 0.90 * L
    if not lex_ok and sem_ok:
        if req.type in ("responsibility", "soft_skill"):
            return "CONFIRMED", S
        if req.type == "hard_skill" and req.priority == "must_have":
            return "INFERRED", alpha * S
        return "INFERRED", 0.8 * S
    partial = 0.5 * max(L, S) if max(L, S) >= 0.25 else 0.0
    return ("WEAK", partial) if partial > 0 else ("MISSING", 0.0)


def rank_of(scores):
    order = sorted(range(len(scores)), key=lambda i: -scores[i])
    ranks = [0] * len(scores)
    for pos, i in enumerate(order):
        ranks[i] = pos + 1
    return ranks


def build_graph(requirements, resumes, lex, sem_raw, sem_evidence, cfg):
    cfg = {**DEFAULT_CONFIG, **(cfg or {})}
    R, C = len(requirements), len(resumes)
    weights = [cfg["w_must"] if r.priority == "must_have" else cfg["w_nice"] for r in requirements]
    wsum = sum(weights) or 1.0

    S = [calibrate(sem_raw[ri], cfg["calibrate_on"]) for ri in range(R)]
    L = [[(lex[ri][ci]["score"] if cfg["ontology_on"] or lex[ri][ci]["kind"] not in ("ontology",) else 0.6 * lex[ri][ci]["bm25_norm"]) for ci in range(C)] for ri in range(R)]

    def total(mode):
        out, per_req = [], []
        for ci in range(C):
            acc, must_hit, must_n, rows = 0.0, 0, 0, []
            for ri, req in enumerate(requirements):
                l = L[ri][ci] if (cfg["keyword_on"] and mode in ("fused", "kw")) else 0.0
                s = S[ri][ci] if (cfg["semantic_on"] and mode in ("fused", "sem")) else 0.0
                if mode == "kw":
                    verdict, fit = ("STATED", l) if l >= cfg["tau_lex"] else ("MISSING", 0.5 * l)
                elif mode == "sem":
                    verdict, fit = ("CONFIRMED", s) if s >= cfg["tau_sem"] else ("MISSING", 0.5 * s)
                else:
                    verdict, fit = fuse_pair(req, l, s, cfg, resumes[ci].months_experience)
                if req.priority == "must_have":
                    must_n += 1
                    must_hit += 1 if fit >= 0.4 else 0
                contribution = 100 * weights[ri] * fit / wsum
                acc += contribution
                rows.append((verdict, fit, l, s, contribution))
            cov = must_hit / must_n if must_n else 1.0
            penalty = max(0.0, cfg["max_penalty"] * (cfg["coverage_floor"] - cov) / cfg["coverage_floor"]) if cfg["coverage_floor"] > 0 else 0.0
            out.append(acc * (1 - penalty))
            per_req.append((rows, cov, penalty))
        return out, per_req

    fused, fused_rows = total("fused")
    kw_scores, _ = total("kw")
    sem_scores, _ = total("sem")
    fused_rank, kw_rank, sem_rank = rank_of(fused), rank_of(kw_scores), rank_of(sem_scores)
    rrf = [1 / (60 + kw_rank[i]) + 1 / (60 + sem_rank[i]) for i in range(C)]
    rrf_rank = rank_of(rrf)

    candidates = []
    for ci, res in enumerate(resumes):
        rows, cov, penalty = fused_rows[ci]
        per_req = []
        for ri, req in enumerate(requirements):
            verdict, fit, l, s, contribution = rows[ri]
            lx = lex[ri][ci]
            ev = []
            if lx.get("chunk") is not None and l > 0:
                ev.append({"chunk_id": lx["chunk"].chunk_id, "line": lx["chunk"].line_no, "section": lx["chunk"].section, "method": lx["kind"], "text": lx["chunk"].text, "score": round(l, 3), "term": lx.get("term"), "matched": lx.get("matched"), "hops": lx.get("hops")})
            for e in sem_evidence[ri][ci][:2]:
                if e["cos"] > 0.25 and not any(x["chunk_id"] == e["chunk"].chunk_id for x in ev):
                    ev.append({"chunk_id": e["chunk"].chunk_id, "line": e["chunk"].line_no, "section": e["chunk"].section, "method": "semantic", "text": e["chunk"].text, "score": round(e["cos"], 3)})
            per_req.append({
                "req_id": req.req_id, "verdict": verdict, "fit": round(fit, 3), "lex": round(l, 3), "sem": round(s, 3),
                "sem_raw": round(sem_raw[ri][ci], 3), "contribution": round(contribution, 2), "weight": weights[ri],
                "evidence": ev, "note": _note(req, verdict, lx, s, cfg, res.months_experience),
            })
        gem_delta = kw_rank[ci] - fused_rank[ci]
        candidates.append({
            "candidate_id": res.resume_id, "name": res.name, "filename": res.filename,
            "final_score": round(fused[ci], 1), "rank": fused_rank[ci],
            "rank_keyword_only": kw_rank[ci], "rank_semantic_only": sem_rank[ci], "rank_rrf": rrf_rank[ci],
            "score_keyword_only": round(kw_scores[ci], 1), "score_semantic_only": round(sem_scores[ci], 1),
            "hidden_gem": gem_delta >= 5, "keyword_delta": gem_delta,
            "coverage_must": round(cov, 2), "penalty": round(penalty, 3),
            "parse_confidence": res.parse_confidence, "parse_method": res.parse_method, "fuzzy_headers": res.fuzzy_headers,
            "months_experience": res.months_experience, "n_chunks": len(res.chunks),
            "per_requirement": per_req,
        })
    candidates.sort(key=lambda c: c["rank"])
    return {"config": cfg, "requirements": [r.to_dict() for r in requirements], "candidates": candidates}


def _note(req, verdict, lx, s, cfg, months=0):
    months_txt = f"{months} months" if months < 24 else f"{months // 12} years"
    if verdict == "CONFIRMED" and lx.get("kind") == "ontology":
        return f"'{lx['matched']}' implies {lx['term']} ({lx['hops']} hop{'s' if lx['hops'] != 1 else ''}); meaning also matches."
    if verdict == "CONFIRMED" and lx.get("kind") in ("exact", "alias"):
        return f"Named explicitly ('{lx['matched']}') and the context supports it."
    if verdict == "CONFIRMED":
        return "Described in different words; meaning matches strongly."
    if verdict == "STATED":
        return f"Term appears ('{lx.get('matched') or 'keyword'}') but surrounding context is thin."
    if verdict == "INFERRED":
        return f"Never named; related experience found. Credit capped at {int(cfg['alpha_inferred']*100)}%."
    if req.type == "experience_level" and req.years:
        return f"JD asks for {req.years}+ years; parsed dates show ~{months_txt} of experience."
    if verdict == "WEAK":
        return "Only a faint signal; not enough to count."
    return "No evidence found in this resume."
