import json
import re
from pathlib import Path


def load_lexicon(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def find_flags(jd_text: str, lexicon: dict, n_hard_skills: int = 0):
    flags = []
    low = jd_text.lower()
    title = next((l for l in jd_text.splitlines() if l.strip()), "").lower()
    is_intern = "intern" in title or "intern" in low[:400]
    for cat, spec in lexicon.items():
        if cat == "experience_contradiction":
            for m in re.finditer(spec["pattern"], jd_text, re.I):
                years = int(m.group(1))
                if years >= 1 and is_intern:
                    ctx = _context(jd_text, m.start(), m.end())
                    flags.append({"id": f"F{len(flags)+1}", "category": cat, "label": spec["label"], "severity": spec["severity"], "phrase": m.group(0), "context": ctx, "rewrite": spec["rewrite"], "replacement": "hands-on project experience", "reason": f"The role is an internship but demands {years}+ years of professional experience."})
            continue
        for term in spec.get("terms", []):
            for m in re.finditer(r"(?<![a-z])" + re.escape(term) + r"(?![a-z])", low):
                ctx = _context(jd_text, m.start(), m.end())
                flags.append({"id": f"F{len(flags)+1}", "category": cat, "label": spec["label"], "severity": spec["severity"], "phrase": jd_text[m.start():m.end()], "context": ctx, "rewrite": spec["rewrite"], "replacement": _neutral(cat, term), "reason": f"'{term}' is {spec['label'].lower()}."})
                break
    if n_hard_skills > 8:
        flags.append({"id": f"F{len(flags)+1}", "category": "over_specification", "label": "Over-specified", "severity": "medium", "phrase": f"{n_hard_skills} required hard skills", "context": "", "rewrite": "Trim to the 5-6 skills that are genuinely essential; move the rest to nice-to-have.", "replacement": None, "reason": f"{n_hard_skills} named hard skills for an entry-level role narrows the funnel sharply."})
    return flags


def _context(text, s, e, pad=60):
    a, b = max(0, s - pad), min(len(text), e + pad)
    snippet = text[a:b].replace("\n", " ")
    return ("…" if a > 0 else "") + snippet + ("…" if b < len(text) else "")


def _neutral(cat, term):
    return {
        "gender_coded": "skilled",
        "age_proxy": "motivated",
        "credential_inflation": "or equivalent project experience",
        "culture_vagueness": "collaborative",
        "ability_coded": "clear communication",
    }.get(cat, "")


def apply_fix(jd_text: str, flag: dict):
    phrase, rep = flag["phrase"], flag.get("replacement")
    if flag["category"] == "experience_contradiction":
        return re.sub(re.escape(phrase) + r"\s*(?:of)?\s*(?:professional|prior|work)?\s*experience", rep or "hands-on project experience", jd_text, count=1, flags=re.I)
    if rep is None:
        return jd_text
    return re.sub(re.escape(phrase), rep, jd_text, count=1, flags=re.I)


def blind_delta(graph_a, graph_b):
    ra = {c["candidate_id"]: c["rank"] for c in graph_a["candidates"]}
    rb = {c["candidate_id"]: c["rank"] for c in graph_b["candidates"]}
    n = max(1, len(ra))
    return round(sum(abs(ra[k] - rb.get(k, ra[k])) for k in ra) / n, 2)
