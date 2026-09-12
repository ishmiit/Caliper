def explain_candidate(cand, requirements, top_n_matched=4, top_n_missing=3):
    """Template explanation rendered strictly from the evidence graph. Every claim cites a requirement id and resume line."""
    req_by_id = {r["req_id"]: r for r in requirements}
    rows = cand["per_requirement"]
    matched = sorted([r for r in rows if r["verdict"] in ("CONFIRMED", "STATED", "INFERRED")], key=lambda r: -r["contribution"])
    missing = sorted([r for r in rows if r["verdict"] in ("MISSING", "WEAK")], key=lambda r: -r["weight"])

    def label(r):
        return req_by_id[r["req_id"]].get("label") or _short(req_by_id[r["req_id"]]["text"])

    strengths = []
    for r in matched[:top_n_matched]:
        ev = r["evidence"][0] if r["evidence"] else None
        cite = f" (line {ev['line'] + 1})" if ev else ""
        how = {"CONFIRMED": "confirmed", "STATED": "stated", "INFERRED": "inferred"}[r["verdict"]]
        strengths.append({"req_id": r["req_id"], "label": label(r), "verdict": r["verdict"], "text": f"{label(r)} — {how}{cite}", "line": ev["line"] if ev else None, "contribution": r["contribution"]})
    gaps = []
    for r in missing[:top_n_missing]:
        req = req_by_id[r["req_id"]]
        gaps.append({"req_id": r["req_id"], "label": label(r), "priority": req["priority"], "text": f"{label(r)}{' (must-have)' if req['priority'] == 'must_have' else ''}"})

    n_conf = sum(1 for r in rows if r["verdict"] == "CONFIRMED")
    n_inf = sum(1 for r in rows if r["verdict"] == "INFERRED")
    n_miss = sum(1 for r in rows if r["verdict"] in ("MISSING", "WEAK"))
    summary = (
        f"Ranked #{cand['rank']} with a score of {cand['final_score']}. "
        f"{n_conf} of {len(rows)} requirements are confirmed by both channels"
        + (f", {n_inf} inferred from related experience" if n_inf else "")
        + (f", {n_miss} not evidenced" if n_miss else "")
        + ". "
    )
    if strengths:
        summary += "Strongest evidence: " + "; ".join(s["text"] for s in strengths[:3]) + ". "
    if gaps:
        summary += "Missing: " + ", ".join(g["text"] for g in gaps) + "."
    if cand.get("hidden_gem"):
        summary += f" A keyword-only screen would have placed this candidate #{cand['rank_keyword_only']}."
    if cand.get("penalty", 0) > 0:
        summary += f" Soft coverage penalty applied: -{int(cand['penalty']*100)}% (only {int(cand['coverage_must']*100)}% of must-haves evidenced)."
    return {"summary": summary, "strengths": strengths, "gaps": gaps}


def _pretty(term):
    return {"node.js": "Node.js", "rest api": "REST APIs", "ci/cd": "CI/CD", "ui/ux": "UI/UX"}.get(term, term.title() if len(term) > 3 else term.upper())


def _short(text, n=48):
    return text if len(text) <= n else text[: n - 1].rsplit(" ", 1)[0] + "…"


def compare(a, b, requirements):
    """Head-to-head: top deltas by contribution between two candidates."""
    req_by_id = {r["req_id"]: r for r in requirements}
    ra = {r["req_id"]: r for r in a["per_requirement"]}
    rb = {r["req_id"]: r for r in b["per_requirement"]}
    deltas = []
    for rid in ra:
        d = ra[rid]["contribution"] - rb[rid]["contribution"]
        deltas.append({"req_id": rid, "label": req_by_id[rid].get("label") or _short(req_by_id[rid]["text"], 40), "delta": round(d, 2), "a": ra[rid], "b": rb[rid]})
    deltas.sort(key=lambda x: -abs(x["delta"]))
    top = deltas[:4]
    higher, lower = (a, b) if a["final_score"] >= b["final_score"] else (b, a)
    parts = []
    for d in top:
        if abs(d["delta"]) < 0.5:
            continue
        winner = a if d["delta"] > 0 else b
        loser = b if d["delta"] > 0 else a
        wrow = ra[d["req_id"]] if winner is a else rb[d["req_id"]]
        lrow = rb[d["req_id"]] if winner is a else ra[d["req_id"]]
        ev = wrow["evidence"][0] if wrow["evidence"] else None
        cite = f" (line {ev['line'] + 1})" if ev else ""
        w, l = winner['name'].split()[0], loser['name'].split()[0]
        if wrow['verdict'] == lrow['verdict']:
            parts.append(f"{d['req_id']} {d['label']}: both {wrow['verdict'].lower()}, but {w}'s evidence is stronger{cite} (fit {wrow['fit']:.2f} vs {lrow['fit']:.2f}, +{abs(d['delta']):.1f} pts)")
        else:
            parts.append(f"{d['req_id']} {d['label']}: {w} is {wrow['verdict'].lower()}{cite} while {l} is {lrow['verdict'].lower()} (+{abs(d['delta']):.1f} pts)")
    text = f"{higher['name']} ranks #{higher['rank']} ({higher['final_score']}) above {lower['name']} at #{lower['rank']} ({lower['final_score']}). The gap comes from: " + "; ".join(parts) + "."
    return {"text": text, "deltas": deltas}
