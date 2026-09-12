import math


def ndcg_at_k(ranked_ids, labels, k=5):
    rels = [labels.get(cid, 0) for cid in ranked_ids[:k]]
    dcg = sum((2 ** r - 1) / math.log2(i + 2) for i, r in enumerate(rels))
    ideal = sorted(labels.values(), reverse=True)[:k]
    idcg = sum((2 ** r - 1) / math.log2(i + 2) for i, r in enumerate(ideal))
    return round(dcg / idcg, 3) if idcg else 0.0


def spearman(ranked_ids, labels):
    try:
        from scipy.stats import spearmanr
    except Exception:
        return None
    ids = [c for c in ranked_ids if c in labels]
    if len(ids) < 3:
        return None
    sys_rank = list(range(1, len(ids) + 1))
    label_vals = [-labels[c] for c in ids]
    rho = spearmanr(sys_rank, label_vals).correlation
    return round(float(rho), 3) if rho == rho else None


def evaluate(graph, labels):
    ids = [c["candidate_id"] for c in graph["candidates"]]
    return {"ndcg5": ndcg_at_k(ids, labels, 5), "spearman": spearman(ids, labels), "n_labelled": len([i for i in ids if i in labels])}
