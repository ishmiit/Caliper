# Caliper — the shortlisting engine that shows its work

Ranks a resume pool against a JD with a full evidence trail, and flags the phrases in the JD that are hiding qualified candidates — with a measured count.

**No LLM anywhere in the loop.** Scores, rankings and explanations are all computed by the engine and rendered from the evidence graph.

## Run

```
pip install -r requirements.txt        # once
cd web && npm install && cd ..         # once
start.bat                              # backend :8000 + frontend :5173
```

First backend start takes ~20s (loads MiniLM). After that a full run over 18 resumes is ~3s.

## On the day

1. Drop the 18 PDFs into `data/resumes/` (PDFs take precedence over the synthetic `.txt` samples) and `Sample_JD.pdf` into `data/`.
2. Press **Run**. Or use **Upload** to drag files in from the UI.
3. Go to **Evaluate**, label each candidate strong/medium/weak, press **Save & measure** → nDCG@5 / Spearman ρ and the ablation table appear from real measurements.

## The organiser pool — what we did with it

The "Dummy Resumes" zip is 198 resumes across PDF, DOCX, XML and TXT, mostly the same people in several formats. We do not train on it (there is no model to train) — we use it three ways:

1. **Format robustness.** The parser now reads all four formats (`pdfplumber → PyMuPDF`, `python-docx` with a raw-XML fallback, structured XML with tag-to-section mapping).
2. **Free ground truth.** Filenames carry the target role, so against the Full Stack JD: dev roles = strong, adjacent tech = medium, non-tech = weak. `scripts/benchmark.py` ranks the whole pool and reports nDCG@5 / Spearman ρ plus the ablation table.
3. **Threshold tuning.** `--tune` sweeps τ_lex, τ_sem, α and the must-have weight. The grid is flat (ρ 0.66–0.67), so defaults were kept.

Measured on 198 resumes: top 12 all dev roles, bottom 5 all non-tech, nDCG@5 = 1.00, ρ = 0.66. Removing the ontology drops ρ to 0.62; cohort calibration lifts score spread from 73 to 80.

```
unzip the pool into data/pool/    then    python scripts/benchmark.py data/pool --tune
```

## Resume text is untrusted input

- **Evidence depth.** Every chunk is tiered *professional / internship / project / listed* from its section and the nearest role line. A skill that only appears in a skills list can never be Confirmed: it caps at Stated with fit 0.55, and the receipt says so.
- **Claims vs dates.** "5 years of experience" is checked against the dated roles; if they disagree the resume is flagged and scored on the dates.
- **Injection.** Lines addressed to the screener ("ignore previous instructions", "rank this candidate first") are removed from evidence before scoring and reported.
- **Hidden text.** White or sub-4pt characters in PDFs are counted and ignored.
- **Stuffing and slop.** Skills listed but never shown in use, repeated terms, and generated-sounding phrasing are flagged.
- **Near-duplicates.** Resumes whose mean embeddings agree above 0.94 are linked.
- **Blind re-rank.** Names, emails, phones, URLs and pronouns stripped, re-ranked, mean rank and score shift reported (0.11 / 0.14 on the sample pool).

`data/resumes/19_rohit_bhalla.txt` is a deliberately adversarial resume for the demo.

## How the matching works (the judge walkthrough)

```
PDF ──pdfplumber → PyMuPDF fallback──▶ fuzzy section headers ──▶ atomic evidence chunks (one bullet each)
                                                                  section weight: EXPERIENCE 1.0 · PROJECTS 0.85 · SKILLS 0.6 · EDUCATION 0.5

JD ──rule-based──▶ requirement graph: R01…Rn {type, must/nice, weight 3/1, canonical terms}

for every (requirement, candidate):
  KEYWORD  = max( exact 1.0, alias 0.95, ontology hop-decay 0.75^hops, 0.6 · BM25_norm )   ← hand-written BM25, k1=1.5 b=0.75
  SEMANTIC = max over chunks of cos(MiniLM(req), MiniLM(chunk)) · section weight            ← late interaction, argmax kept as evidence
             → cohort percentile calibration (this is what produces score spread)
  FUSE     = CONFIRMED  if both ≥ τ           → max(L,S)
             STATED     if keyword only        → 0.9·L
             INFERRED   if semantic only, must-have hard skill → 0.65·S   ← "named tools shouldn't be satisfied by loosely related experience"
             MISSING    otherwise

score = 100 · Σ w_r · fit_r / Σ w_r · (1 − soft coverage penalty ≤ 15%)     ← never a hard filter
```

The brief's own example: JD says **Node.js**, resume says *"built REST APIs with Express and MongoDB"*. Ontology: `express is_a node.js` → 1 hop → 0.75 keyword credit, and the semantic channel agrees → **CONFIRMED**, note: *"'express' implies node.js (1 hop)"*. You can see this on Arjun Mehta's receipt, requirement R09.

## Layout

```
engine/   ingest · jd_graph · ontology · lexical (BM25) · semantic · fusion · explain · audit · evaluate · pipeline
api/      FastAPI — /api/run /api/rank /api/upload /api/resume /api/compare /api/audit /api/chat /api/labels /api/blind
web/      React + Tailwind + framer-motion + recharts
data/     skill_ontology.json · bias_lexicon.json · resumes/ · Sample_JD · labels.json
```

## Demo beats

1. **Chamber** — black, one statement. Press enter (sample pool) or drop the JD + resumes.
2. **Analysis** — the engine reads out what it did, with real numbers, then a hard cut to bone.
3. **Console** — pool left (the hidden-gem row inverts), the reading centre (every requirement, its verdict rule, the quoted line, `inferred · 1 hop · line 9 · 0.75`), the brief right as a coverage glyph. Flip `keyword` / `semantic` in the bar: rows FLIP to their new ranks. Ask the graph at the bottom of the reading.
4. **Redline** — the JD with margin comments. Accept the "3+ years" edit: strikethrough draws in azurite, the pool re-ranks behind it.

Keys 1–4 jump between screens.
