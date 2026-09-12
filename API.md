# Caliper API

Base: `http://127.0.0.1:8000` (use the IP, not `localhost` — Windows adds ~2s per request resolving IPv6 first).
Start: `python -m uvicorn api.main:app --host 127.0.0.1 --port 8000`. First start loads MiniLM (~20s); after that a full run is ~3s.

All state lives in one server session: the last pool + JD + config. Every ranking call returns the same **graph** shape.

## Endpoints

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/api/run` | — | graph. Re-ingests the default pool (`data/judged/` if present, else `data/resumes/`) against `data/Sample_JD.pdf`. Resets toggles. |
| POST | `/api/upload` | multipart: `jd` (pdf/txt, optional), `jd_text` (optional), `resumes[]` (pdf/docx/xml/txt) | graph for the uploaded pool |
| POST | `/api/rank` | `{ "config": { keyword_on, semantic_on, ontology_on, calibrate_on, alpha_inferred, tau_lex, tau_sem, w_must } }` | graph re-fused with those settings (10ms, no re-embedding). Partial config is merged. |
| POST | `/api/jd` | `{ "jd_text": "..." }` | graph against an edited JD (re-decomposes, re-scores) |
| GET | `/api/resume/{candidate_id}` | — | `{ name, lines[], sections{SECTION: line}, chunks[], parse_method, parse_confidence, fuzzy_headers }` |
| GET | `/api/compare/{a}/{b}` | — | `{ text, deltas[{req_id, label, delta, a, b}] }` head-to-head |
| POST | `/api/chat` | `{ "message": "Why is Aditi above Priya?" }` | `{ text, citations[{candidate_id?, req_id?, line?}], compare?: [a, b] }` |
| GET | `/api/audit` | — | `{ flags[] }` — JD bias flags with counterfactuals (2s: re-ranks per flag) |
| POST | `/api/audit/apply/{flag_id}` | — | graph after applying that flag's rewrite to the JD |
| GET | `/api/blind` | — | `{ delta_blind, delta_score, ranks[{candidate_id, name, rank, rank_blind, score, score_blind}] }` (3s) |
| GET | `/api/ablation` | — | `{ rows[{config, ndcg5, spearman, spread}], labels }` — null rows if no labels |
| POST | `/api/labels` | `{ "labels": { "r01": 3, "r02": 1 } }` (3 strong · 2 medium · 1 weak) | ablation rows + metrics |
| GET | `/api/health` | — | `{ ok, resumes, requirements }` |

## Graph

```jsonc
{
  "jd_title": "Junior Full Stack Developer Intern | Bengaluru (Hybrid) | 6-Month Internship",
  "jd_text": "...",
  "config": { "keyword_on": true, "semantic_on": true, "alpha_inferred": 0.65, "tau_lex": 0.35, "tau_sem": 0.55, "w_must": 3, ... },
  "metrics": { "ndcg5": 1.0, "spearman": 0.905, "n_labelled": 18 } | null,
  "timing_ms": 12,
  "log": [ { "step": "Parsed 18 documents", "ms": 776, "count": 18, "methods": {"pdfplumber": 18} },
           { "step": "Section headers recovered: 72 (2 fuzzy-matched)", "ms": 776, "headers": 72, "fuzzy": 2 },
           { "step": "Evidence chunks extracted: 197", "ms": 776, "chunks": 197 },
           { "step": "BM25 index built: vocab 686 terms, avgdl 71", "ms": 1, "vocab": 686 },
           { "step": "Embedded 197 chunks · 384-dim · local MiniLM", "ms": 1567, "chunks": 197, "dim": 384 },
           { "step": "Integrity pass: 0 flags · 0 near-duplicates", "ms": 243, "flags": 0, "dups": 0 },
           { "step": "JD decomposed: 21 requirements (11 must / 10 nice)", "ms": 88, "n_req": 21, "must": 11 },
           { "step": "Scored 378 requirement × candidate pairs", "ms": 283, "pairs": 378 },
           { "step": "Done", "ms": 2961 } ],
  "requirements": [
    { "req_id": "R06", "label": "JavaScript · React", "text": "Proficiency in JavaScript (ES6+) and ...",
      "type": "hard_skill" | "soft_skill" | "responsibility" | "qualification" | "experience_level",
      "priority": "must_have" | "nice_to_have", "weight": 3.0, "terms": ["javascript", "react"], "years": 0 }
  ],
  "candidates": [                       // sorted by rank
    { "candidate_id": "r01", "name": "Aditi Sharma", "filename": "Resume_01_Aditi_Sharma.pdf",
      "final_score": 75.7, "rank": 1, "rank_keyword_only": 2, "rank_semantic_only": 1, "rank_rrf": 1,
      "score_keyword_only": 61.2, "score_semantic_only": 58.0,
      "hidden_gem": false, "keyword_delta": 1,          // keyword rank − fused rank; gem when ≥ 5
      "coverage_must": 0.91, "penalty": 0.0,           // share of must-haves with fit ≥ 0.4; soft penalty ≤ 15%
      "parse_confidence": 1.0, "parse_method": "pdfplumber", "fuzzy_headers": 0,
      "months_experience": 3, "n_chunks": 17,
      "depth": { "professional": 0, "internship": 12, "project": 3, "listed": 2 },   // where matched evidence came from
      "integrity": [ { "kind": "injection" | "contradiction" | "hidden_text" | "timeline" | "stuffing" | "slop",
                       "severity": "high" | "medium" | "low", "text": "Claims 5 years of experience; dated roles add up to 1 months. ..." } ],
      "duplicates": ["r07"],                           // near-identical resumes (cos ≥ 0.94)
      "explanation": { "summary": "Ranked #1 with a score of 75.7. 14 of 21 requirements ...",
                       "strengths": [ { "req_id", "label", "verdict", "text", "line", "contribution" } ],
                       "gaps": [ { "req_id", "label", "priority", "text" } ] },
      "per_requirement": [
        { "req_id": "R07", "verdict": "CONFIRMED" | "STATED" | "INFERRED" | "WEAK" | "MISSING",
          "fit": 0.95, "lex": 0.95, "sem": 0.83, "sem_raw": 0.61, "contribution": 6.6, "weight": 3.0,
          "note": "Named explicitly ('node.js') and the context supports it.",
          "evidence": [ { "chunk_id": "r01_c007", "line": 13, "section": "EXPERIENCE",
                          "depth": "internship", "demonstrated": true,
                          "method": "exact" | "alias" | "ontology" | "hedged" | "bm25" | "semantic" | "negated",
                          "text": "Developed Node.js/Express backend endpoints for a notifications module, tested with Jest",
                          "score": 0.95, "term": "node.js", "matched": "node.js", "hops": 0 } ] }
      ]
    }
  ]
}
```

`line` is 0-based into `/api/resume/{id}.lines`; display as `line + 1`.

### Verdicts
- **CONFIRMED** — keyword and meaning both match (or a responsibility paraphrased strongly).
- **STATED** — keyword present, context thin. Listed-only evidence (skills list, summary) can never exceed STATED and caps at fit 0.55.
- **INFERRED** — meaning matches, term never named. Must-have hard skills cap at α = 0.65.
- **WEAK** — faint signal, half credit.
- **MISSING** — nothing, or the resume *states* it lacks the skill (`method: "negated"`, note cites the line).

### Audit flag
```jsonc
{ "id": "F1", "category": "experience_contradiction", "label": "Experience contradiction", "severity": "high",
  "phrase": "3+ years", "context": "…3+ years of professional experience…", "reason": "...",
  "rewrite": "...", "replacement": "hands-on project experience",
  "hard_filter": { "req_ids": ["R11"], "rejects": 18, "total": 18, "top_rejects": [{ "candidate_id", "name", "rank" }] } | null,
  "counterfactual": { "entered_top_n": 2, "top_n": 8, "movers": [{ "candidate_id", "name", "from", "to" }], "new_jd": "..." } | null }
```

## Notes for the demo
- `POST /api/run` always restarts from the original JD, so a redlined session can be reset with one call.
- Toggles (`/api/rank`) do not re-embed; they re-fuse cached channels — safe to call on every switch.
- `/api/audit` and `/api/blind` take 2–4s each; call them once and cache in the UI.
- Everything is local: no network calls after the model loads.
