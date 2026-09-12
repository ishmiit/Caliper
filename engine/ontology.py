import json
import re
from pathlib import Path


GENERIC = {"projects", "programming language", "degree", "web framework", "collaboration", "communication", "problem solving", "api design", "architecture",
           "backend", "frontend", "full stack", "database", "web development", "internship", "cloud", "data", "testing", "deployment", "devops", "frontend framework", "mobile", "security", "state management"}
SOFT = {"communication", "collaboration", "problem solving", "agile"}


class Ontology:
    def __init__(self, path: Path):
        self.nodes = json.loads(path.read_text(encoding="utf-8"))
        self.alias_to_key = {}
        for key, node in self.nodes.items():
            self.alias_to_key[key] = key
            for a in node.get("aliases", []):
                self.alias_to_key[a.lower()] = key
        self.all_aliases_flat = sorted(self.alias_to_key.keys(), key=len, reverse=True)
        self._patterns = {a: re.compile(r"(?<![a-z0-9+#.])" + re.escape(a) + r"(?![a-z0-9+#])", re.I) for a in self.all_aliases_flat}
        self.children = {}
        for key, node in self.nodes.items():
            for parent in node.get("is_a", []):
                self.children.setdefault(parent, set()).add(key)
            for child in node.get("expands_to", []):
                self.children.setdefault(key, set()).add(child)
                self.children.setdefault(child, set()).add(key)

    def canonical(self, key):
        return self.nodes.get(key, {}).get("canonical", key)

    def find_terms(self, text_low: str):
        found = []
        for a in self.all_aliases_flat:
            if len(a) < 2:
                continue
            if self._patterns[a].search(text_low):
                k = self.alias_to_key[a]
                if k not in found:
                    found.append(k)
        generic = GENERIC
        specific = [k for k in found if k not in generic]
        return specific if specific else found[:2]

    def expand(self, terms):
        out = set()
        for t in terms:
            for child, hops in self.descendants(t, 2).items():
                out.add(child)
        return sorted(out - set(terms))

    def descendants(self, key, max_hops=2):
        result = {}
        frontier = [(key, 0)]
        while frontier:
            k, h = frontier.pop()
            if h >= max_hops:
                continue
            for c in self.children.get(k, ()):
                if c not in result or result[c] > h + 1:
                    result[c] = h + 1
                    frontier.append((c, h + 1))
        return result

    def parents(self, key, max_hops=2):
        result = {}
        frontier = [(key, 0)]
        while frontier:
            k, h = frontier.pop()
            if h >= max_hops:
                continue
            for p in self.nodes.get(k, {}).get("is_a", []):
                if p not in result or result[p] > h + 1:
                    result[p] = h + 1
                    frontier.append((p, h + 1))
        return result

    def hops(self, jd_term, resume_term):
        if jd_term == resume_term:
            return 0
        d = self.descendants(jd_term, 2)
        if resume_term in d:
            return d[resume_term]
        p = self.parents(jd_term, 1)
        if resume_term in p:
            return 2
        return None

    def terms_in_text(self, text_low):
        hits = {}
        for a in self.all_aliases_flat:
            if len(a) < 2:
                continue
            for m in self._patterns[a].finditer(text_low):
                k = self.alias_to_key[a]
                hits.setdefault(k, []).append((m.start(), a))
        return hits
