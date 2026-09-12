import re
from dataclasses import dataclass, field
from engine.ontology import Ontology, SOFT, GENERIC

NICE_CUES = ["plus", "bonus", "nice to have", "nice-to-have", "preferred", "familiarity", "exposure", "a plus", "ideally", "good to have", "advantage", "optional", "desirable"]
MUST_CUES = ["required", "must", "essential", "strong", "proficient", "solid", "demonstrated", "hands-on", "hands on", "experience with", "experience in", "knowledge of"]
SOFT_TERMS = ["communication", "team", "collaborat", "problem-solving", "problem solving", "self-motivated", "learn", "attention to detail", "ownership", "curious", "eager", "willing", "adapt"]
QUAL_TERMS = ["degree", "b.tech", "bachelor", "pursuing", "student", "graduate", "cgpa", "university", "college", "year of study", "semester"]
VERBS = ["build", "develop", "write", "collaborate", "work", "implement", "design", "participate", "assist", "contribute", "maintain", "debug", "integrate", "test", "deploy", "create", "own", "ship"]
NICE_SECTION = re.compile(r"(nice[\s-]*to[\s-]*have|preferred|bonus|good[\s-]*to[\s-]*have|plus)", re.I)
MUST_SECTION = re.compile(r"(requirement|required|must|qualification|what we.?re looking for|skills)", re.I)
RESP_SECTION = re.compile(r"(responsibilit|what you.?ll do|you will|day[\s-]*to[\s-]*day)", re.I)
BULLET = re.compile(r"^\s*[•\-\*▪◦●·»➢✓–—\d]+[\.\)]?\s*")
YEARS = re.compile(r"(\d+)\s*\+?\s*(?:years|yrs)", re.I)


@dataclass
class Requirement:
    req_id: str
    text: str
    type: str
    priority: str
    weight: float
    terms: list = field(default_factory=list)
    expansion: list = field(default_factory=list)
    section: str = ""
    line_no: int = 0
    years: int = 0
    label: str = ""

    def to_dict(self):
        return self.__dict__.copy()


def decompose(jd_text: str, onto: Ontology, w_must=3.0, w_nice=1.0):
    lines = [l.strip() for l in jd_text.splitlines()]
    reqs = []
    section_mode = "other"
    title = next((l for l in lines if l), "")
    for i, line in enumerate(lines):
        if not line:
            continue
        low = line.lower()
        is_header = len(line) < 60 and (line.endswith(":") or (line.isupper() and len(line.split()) <= 6) or (len(line.split()) <= 5 and not BULLET.match(line) and not low.endswith(".")))
        if is_header and i > 0:
            if NICE_SECTION.search(low):
                section_mode = "nice"
            elif RESP_SECTION.search(low):
                section_mode = "resp"
            elif MUST_SECTION.search(low):
                section_mode = "must"
            else:
                section_mode = "other"
            continue
        if section_mode == "other" or i == 0:
            continue
        text = BULLET.sub("", line).strip()
        if len(text) < 12 or len(text.split()) < 3:
            continue
        for piece in _split_compound(text):
            reqs.append(_make(piece, section_mode, i, onto, w_must, w_nice))
    if not reqs:
        for i, line in enumerate(lines):
            text = BULLET.sub("", line).strip()
            if len(text.split()) >= 4 and any(t in text.lower() for t in onto.all_aliases_flat):
                reqs.append(_make(text, "must", i, onto, w_must, w_nice))
    for k, r in enumerate(reqs):
        r.req_id = f"R{k+1:02d}"
    return {"title": title, "requirements": reqs}


def _split_compound(text):
    if len(text) > 140 and ";" in text:
        return [p.strip() for p in text.split(";") if len(p.strip()) > 12]
    return [text]


def _make(text, mode, line_no, onto: Ontology, w_must, w_nice):
    low = text.lower()
    terms = onto.find_terms(low)
    if any(c in low for c in NICE_CUES) or mode == "nice":
        priority = "nice_to_have"
    else:
        priority = "must_have"
    if YEARS.search(low) and "experience" in low and len(terms) <= 1:
        rtype = "experience_level"
    elif any(q in low for q in QUAL_TERMS) and len(terms) <= 1:
        rtype = "qualification"
    elif mode == "resp" or (any(low.startswith(v) for v in VERBS) and len(terms) == 0):
        rtype = "responsibility"
    elif terms:
        rtype = "hard_skill"
    elif any(s in low for s in SOFT_TERMS):
        rtype = "soft_skill"
    else:
        rtype = "responsibility"
    if rtype == "responsibility" and terms:
        rtype = "hard_skill" if mode != "resp" else "responsibility"
    if terms and all(t in SOFT for t in terms):
        rtype = "soft_skill" if mode != "resp" else "responsibility"
    expansion = onto.expand(terms)
    years = YEARS.search(low)
    r = Requirement("", text, rtype, priority, w_must if priority == "must_have" else w_nice, terms, expansion, mode, line_no)
    r.years = int(years.group(1)) if (years and rtype == "experience_level") else 0
    specific = [t for t in terms if t not in SOFT and t not in GENERIC][:2]
    r.label = " · ".join(onto.canonical(t) for t in specific) if specific else (text if len(text) <= 42 else text[:41].rsplit(" ", 1)[0] + "…")
    return r
