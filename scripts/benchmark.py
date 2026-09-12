"""Benchmark the engine on a large mixed-format pool with labels derived from filename role tags.

Usage:  python scripts/benchmark.py <folder-of-resumes> [--tune]
Labels: strong=3 for dev roles matching the Full Stack JD, medium=2 for adjacent tech, weak=1 otherwise.
"""
import itertools
import json
import re
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from engine.evaluate import evaluate  # noqa: E402
from engine.fusion import build_graph, DEFAULT_CONFIG  # noqa: E402
from engine.pipeline import Session, DATA  # noqa: E402

STRONG = ["sde", "web_dev", "web_developer", "full_stack", "python_dev", "python_developer", "webdev", "python resume"]
MEDIUM = ["app_dev", "app_developer", "appdev", "ai_dev", "ai_developer", "ai developer", "data_scientist", "data_analyst", "ds resume", "ml_engineer", "devops", "cloud", "cyber", "blockchain", "game_dev", "embedded", "qa_engineer", "devrel"]


def label_for(name: str):
    n = name.lower().replace(" ", "_")
    if any(k.replace(" ", "_") in n for k in STRONG):
        return 3
    if any(k.replace(" ", "_") in n for k in MEDIUM):
        return 2
    return 1


def main():
    folder = Path(sys.argv[1])
    tune = "--tune" in sys.argv
    s = Session()
    jd = (DATA / "Sample_JD.txt").read_text(encoding="utf-8")
    t = time.time()
    s.ingest(jd, resume_folder=folder)
    print(f"ingested {len(s.resumes)} resumes in {time.time()-t:.1f}s")
    methods = {}
    for r in s.resumes:
        methods[r.parse_method] = methods.get(r.parse_method, 0) + 1
    print("parse methods:", methods)
    labels = {r.resume_id: label_for(r.filename) for r in s.resumes}
    dist = {v: sum(1 for x in labels.values() if x == v) for v in (3, 2, 1)}
    print("labels strong/medium/weak:", dist)
    s.labels = labels

    g = s.rank()
    m = evaluate(g, labels)
    scores = [c["final_score"] for c in g["candidates"]]
    print(f"\nDEFAULT  nDCG@5={m['ndcg5']}  spearman={m['spearman']}  spread={max(scores)-min(scores):.0f}")
    print("\ntop 12:")
    for c in g["candidates"][:12]:
        print(f"  #{c['rank']:2d} {c['final_score']:5.1f} kw#{c['rank_keyword_only']:3d} sem#{c['rank_semantic_only']:3d} {'GEM' if c['hidden_gem'] else '   '} L{labels[c['candidate_id']]} {c['filename']}")
    print("\nbottom 5:")
    for c in g["candidates"][-5:]:
        print(f"  #{c['rank']:2d} {c['final_score']:5.1f} L{labels[c['candidate_id']]} {c['filename']}")

    print("\nABLATION")
    for row in s.ablation():
        print(f"  {row['config']:22s} nDCG@5={row['ndcg5']:.3f} rho={row['spearman']}  spread={row['spread']}")

    if tune:
        print("\nTUNING (grid over tau_lex, tau_sem, alpha, w_must)")
        best = []
        for tl, ts, al, wm in itertools.product([0.25, 0.35, 0.45], [0.45, 0.55, 0.65], [0.5, 0.65, 0.8], [2.0, 3.0, 4.0]):
            cfg = {**DEFAULT_CONFIG, "tau_lex": tl, "tau_sem": ts, "alpha_inferred": al, "w_must": wm}
            for r in s.requirements:
                r.weight = wm if r.priority == "must_have" else 1.0
            gg = build_graph(s.requirements, s.resumes, s.lex, s.sem_raw, s.sem_ev, cfg)
            mm = evaluate(gg, labels)
            best.append((mm["spearman"] or 0, mm["ndcg5"], tl, ts, al, wm))
        best.sort(reverse=True)
        for row in best[:8]:
            print(f"  rho={row[0]:.3f} nDCG@5={row[1]:.3f}  tau_lex={row[2]} tau_sem={row[3]} alpha={row[4]} w_must={row[5]}")
        for r in s.requirements:
            r.weight = 3.0 if r.priority == "must_have" else 1.0

    out = {"n": len(s.resumes), "methods": methods, "labels": dist, "metrics": m, "ablation": s.ablation()}
    (Path(__file__).parent / "benchmark_last.json").write_text(json.dumps(out, indent=2))


if __name__ == "__main__":
    main()
