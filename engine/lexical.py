import math
import re
from collections import Counter

TOKEN = re.compile(r"[a-z0-9][a-z0-9+#.\-]*[a-z0-9+#]|[a-z0-9]")
STOP = set("a an the and or of to in with for on at by from as is are be been this that these those we you your our their it its will can using use used into via over under across within".split())


def tokenize(text):
    return [t for t in TOKEN.findall(text.lower()) if t not in STOP]


class BM25:
    """Hand-written Okapi BM25. k1 controls term-frequency saturation, b controls length normalisation."""

    def __init__(self, docs, k1=1.5, b=0.75):
        self.k1, self.b = k1, b
        self.docs = [tokenize(d) for d in docs]
        self.N = len(self.docs)
        self.avgdl = sum(len(d) for d in self.docs) / max(1, self.N)
        self.tf = [Counter(d) for d in self.docs]
        self.df = Counter()
        for d in self.docs:
            for t in set(d):
                self.df[t] += 1
        self.vocab = len(self.df)

    def idf(self, term):
        n = self.df.get(term, 0)
        return math.log((self.N - n + 0.5) / (n + 0.5) + 1)

    def score(self, query, doc_idx):
        tf, dl = self.tf[doc_idx], len(self.docs[doc_idx])
        s = 0.0
        for t in tokenize(query):
            f = tf.get(t, 0)
            if f == 0:
                continue
            s += self.idf(t) * (f * (self.k1 + 1)) / (f + self.k1 * (1 - self.b + self.b * dl / self.avgdl))
        return s

    def scores(self, query):
        return [self.score(query, i) for i in range(self.N)]

    def explain_terms(self, query):
        return {t: round(self.idf(t), 3) for t in tokenize(query)}


def lexical_channel(requirement, resume, onto, bm25_norm, gamma=0.75):
    """Returns lexical score in [0,1] plus the evidence chunk that produced it."""
    best = {"score": 0.0, "kind": "none", "term": None, "matched": None, "hops": None, "chunk": None}
    negated = None
    if requirement.terms:
        for chunk in resume.chunks:
            if chunk.section == "HEADER":
                continue
            hits = chunk.__dict__.get("term_hits")
            if hits is None:
                hits = chunk.term_hits = onto.terms_in_text(chunk.text.lower())
            for jd_term in requirement.terms:
                for res_term, occ in hits.items():
                    h = onto.hops(jd_term, res_term)
                    if h is None:
                        continue
                    positive = [o for o in occ if o[2] != "neg"]
                    if not positive:
                        if h == 0 and negated is None:
                            negated = {"term": jd_term, "matched": res_term, "chunk": chunk}
                        continue
                    hedged = all(o[2] == "hedge" for o in positive)
                    alias_used = positive[0][1]
                    if h == 0:
                        credit = 1.0 if alias_used == jd_term or alias_used == onto.canonical(jd_term).lower() else 0.95
                        kind = "exact" if credit == 1.0 else "alias"
                    else:
                        credit = gamma ** h
                        kind = "ontology"
                    credit *= (0.5 + 0.5 * chunk.weight)
                    if hedged:
                        credit *= 0.7
                        kind = "hedged"
                    if credit > best["score"]:
                        best = {"score": credit, "kind": kind, "term": jd_term, "matched": res_term, "hops": h, "chunk": chunk}
    if best["score"] == 0.0 and negated is not None:
        return {"score": 0.0, "kind": "negated", "term": negated["term"], "matched": negated["matched"], "hops": 0, "chunk": negated["chunk"], "bm25_norm": round(bm25_norm, 3)}
    bm = 0.6 * bm25_norm
    if bm > best["score"]:
        best = {"score": bm, "kind": "bm25", "term": None, "matched": None, "hops": None, "chunk": _best_bm25_chunk(requirement, resume)}
    best["bm25_norm"] = round(bm25_norm, 3)
    return best


def _best_bm25_chunk(requirement, resume):
    q = set(tokenize(requirement.text))
    best, best_n = None, 0
    for c in resume.chunks:
        n = len(q & set(tokenize(c.text)))
        if n > best_n:
            best, best_n = c, n
    return best
