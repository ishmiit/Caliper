"""Resume text is untrusted input. This module scores depth of evidence, checks a resume's own claims
against its dates, and flags attempts to game an automated screen."""
import re
import numpy as np

DEPTH_WEIGHT = {"professional": 1.0, "internship": 0.9, "project": 0.8, "listed": 0.55}
DEPTH_LABEL = {"professional": "professional experience", "internship": "internship", "project": "project", "listed": "listed only"}

ACTION_VERBS = re.compile(r"\b(built|shipped|deployed|developed|implemented|designed|led|owned|migrated|optimi[sz]ed|architected|integrated|automated|launched|maintained|scaled|reduced|increased)\b", re.I)
INTERN_ROLE = re.compile(r"\b(intern|internship|trainee|apprentice|summer analyst)\b", re.I)

INJECTION = [
    re.compile(p, re.I) for p in [
        r"ignore (all |any )?(previous|prior|above) (instructions|prompts?)",
        r"(you are|act as) (an? )?(ai|assistant|recruiter|screening)",
        r"(rank|score|rate|place) (this|the) (candidate|resume|applicant) (as |at |#)?(top|first|highly|highest|\d)",
        r"give (this|the) (candidate|resume) (a |the )?(highest|top|maximum|full) (score|rating|rank)",
        r"^\s*(system|assistant)\s*:",
        r"\[(inst|/inst)\]|system prompt|<\|im_start\|>",
        r"(note|message|instructions?) (to|for) (the )?(screening|screener|ai|model|system|recruiter bot)",
        r"this (candidate|applicant) (is|must be|should be) (the )?(best|perfect|ideal) (fit|match)",
        r"do not (reject|filter|penali[sz]e)",
    ]
]
SLOP = ["spearheaded", "cross-functional", "leveraged", "synergy", "synergies", "results-driven", "dynamic professional", "proven track record", "passionate about", "thought leader", "best-in-class", "cutting-edge", "seamlessly", "robust solutions", "detail-oriented team player", "go-getter", "self-starter", "fast-paced environment", "hit the ground running", "outside the box"]
CLAIM = re.compile(r"(\d{1,2})\s*\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:professional\s+|work\s+|industry\s+|hands-on\s+)?experience", re.I)
ZERO_WIDTH = re.compile(r"[​‌‍⁠﻿]")


def assign_depth(resume):
    """Tier every chunk: professional / internship / project / listed, from its section and the nearest role line."""
    lines = resume.lines
    for c in resume.chunks:
        if c.section == "PROJECTS":
            tier = "project"
        elif c.section == "EXPERIENCE":
            tier = "professional"
            for j in range(c.line_no, max(-1, c.line_no - 8), -1):
                ln = lines[j].strip()
                if not ln:
                    continue
                if INTERN_ROLE.search(ln):
                    tier = "internship"
                    break
                if not re.match(r"^\s*[•\-\*▪◦●·»➢✓–—]", lines[j]) and j != c.line_no and re.search(r"\d{4}|present|current", ln, re.I):
                    tier = "internship" if INTERN_ROLE.search(ln) else "professional"
                    break
            if INTERN_ROLE.search(c.text):
                tier = "internship"
        else:
            tier = "listed"
        demonstrated = bool(ACTION_VERBS.search(c.text)) and tier != "listed"
        c.depth = tier
        c.demonstrated = demonstrated
        c.weight = DEPTH_WEIGHT[tier] * (1.0 if demonstrated or tier == "listed" else 0.94)


def strip_injections(resume):
    """Remove chunks that address the screener rather than describe the candidate. Returns the removed texts."""
    removed = []
    kept = []
    for c in resume.chunks:
        if any(p.search(c.text) for p in INJECTION):
            removed.append(c.text)
        else:
            kept.append(c)
    resume.chunks = kept
    return removed


def check(resume, hidden_chars=0, injected=None, onto=None):
    flags = []
    if onto is not None:
        listed_terms, used_terms = set(), set()
        for c in resume.chunks:
            hits = onto.terms_in_text(c.text.lower())
            (listed_terms if c.depth == "listed" else used_terms).update(hits.keys())
        only_listed = listed_terms - used_terms
        if len(only_listed) >= 12 and len(used_terms) <= max(3, len(only_listed) // 5):
            flags.append({"kind": "stuffing", "severity": "medium", "text": f"{len(only_listed)} skills listed, {len(used_terms)} shown in use anywhere in the resume."})
    raw = resume.raw_text
    low = raw.lower()

    for t in injected or []:
        flags.append({"kind": "injection", "severity": "high", "text": f"Instruction aimed at the screener removed from evidence: “{t[:90]}”"})
    if hidden_chars > 20:
        flags.append({"kind": "hidden_text", "severity": "high", "text": f"{hidden_chars} characters of hidden text (white or sub-4pt) in the PDF; ignored."})
    zw = len(ZERO_WIDTH.findall(raw))
    if zw > 5:
        flags.append({"kind": "hidden_text", "severity": "medium", "text": f"{zw} zero-width characters in the text."})

    claims = [int(m.group(1)) for m in CLAIM.finditer(raw)]
    if claims:
        claimed = max(claims)
        dated = resume.months_experience / 12
        if claimed >= 1 and claimed > dated + 0.75:
            flags.append({"kind": "contradiction", "severity": "high", "text": f"Claims {claimed} years of experience; dated roles add up to {resume.months_experience} months. Scored on the dates, not the claim."})

    from engine.ingest import DATE_RANGE, _ym, NOW
    for m in DATE_RANGE.finditer(raw):
        a, b = _ym(m.group(1)), _ym(m.group(2))
        if a and b and b < a:
            flags.append({"kind": "timeline", "severity": "medium", "text": f"Date range ends before it starts: “{m.group(0)}”."})
        elif b and b > NOW + 12 and not re.search(r"expected|graduat|20\d\d\s*[-–]\s*20\d\d", m.group(0) + raw[max(0, m.start()-40):m.start()], re.I):
            flags.append({"kind": "timeline", "severity": "low", "text": f"Future end date: “{m.group(0)}”."})

    listed = [c for c in resume.chunks if c.depth == "listed"]
    if resume.chunks and len(listed) / len(resume.chunks) > 0.6 and len(resume.chunks) >= 8:
        flags.append({"kind": "stuffing", "severity": "medium", "text": f"{int(100*len(listed)/len(resume.chunks))}% of the resume is lists with no demonstrated use."})
    words = re.findall(r"[a-z][a-z+.#]{2,}", low)
    if words:
        from collections import Counter
        top = Counter(w for w in words if len(w) > 3).most_common(1)
        if top and top[0][1] >= 12 and top[0][1] / len(words) > 0.03:
            flags.append({"kind": "stuffing", "severity": "medium", "text": f"“{top[0][0]}” repeated {top[0][1]} times."})

    slop_hits = [s for s in SLOP if s in low]
    if len(slop_hits) >= 3:
        flags.append({"kind": "slop", "severity": "low", "text": "Generated-sounding phrasing: " + ", ".join(slop_hits[:4]) + "."})

    return flags


def duplicate_clusters(resumes, chunk_vecs, threshold=0.94):
    """Near-identical resumes by mean chunk embedding. Returns {resume_id: [other_ids]}."""
    ids = [r.resume_id for r in resumes if len(r.chunks)]
    if len(ids) < 2:
        return {}
    M = np.stack([chunk_vecs[i].mean(axis=0) for i in ids])
    M = M / (np.linalg.norm(M, axis=1, keepdims=True) + 1e-9)
    S = M @ M.T
    out = {}
    for a in range(len(ids)):
        near = [ids[b] for b in range(len(ids)) if b != a and S[a, b] >= threshold]
        if near:
            out[ids[a]] = near
    return out


def evidence_depth_summary(cand_rows, chunks_by_id):
    """Counts of depth tiers across matched requirements for one candidate."""
    counts = {"professional": 0, "internship": 0, "project": 0, "listed": 0}
    for p in cand_rows:
        if p["verdict"] in ("CONFIRMED", "STATED", "INFERRED") and p["evidence"]:
            d = p["evidence"][0].get("depth")
            if d in counts:
                counts[d] += 1
    return counts
