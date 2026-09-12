import os
import numpy as np

os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

_model = None


def get_model():
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


def embed(texts):
    if not texts:
        return np.zeros((0, 384), dtype=np.float32)
    return get_model().encode(texts, normalize_embeddings=True, batch_size=64, show_progress_bar=False).astype(np.float32)


def semantic_channel(req_vec, resume, chunk_vecs, top_k=3):
    """ColBERT-style late interaction: max over section-weighted chunk cosines. Keeps the argmax as evidence."""
    if len(resume.chunks) == 0:
        return {"raw": 0.0, "evidence": []}
    cos = chunk_vecs @ req_vec
    weights = np.array([c.weight for c in resume.chunks], dtype=np.float32)
    weighted = cos * (0.5 + 0.5 * weights)
    order = np.argsort(-weighted)[:top_k]
    evidence = [{"chunk": resume.chunks[i], "cos": float(cos[i]), "score": float(weighted[i])} for i in order]
    return {"raw": float(weighted[order[0]]), "evidence": evidence}
