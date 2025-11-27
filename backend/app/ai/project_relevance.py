from difflib import SequenceMatcher
import re

def _clean(s: str):
    return re.sub(r'\s+', ' ', (s or "").strip().lower())

def _similarity(a: str, b: str):
    return SequenceMatcher(None, _clean(a), _clean(b)).ratio()

def project_relevance_score(projects, responsibilities, threshold=0.35):
    if not responsibilities:
        return 1.0

    if not projects:
        return 0.0

    scores = []

    for r in responsibilities:
        r_clean = _clean(r)
        if not r_clean:
            continue

        best = 0.0
        for p in projects:
            p_clean = _clean(p)
            if not p_clean:
                continue
            sim = _similarity(p_clean, r_clean)
            if sim > best:
                best = sim

        scores.append(best if best >= threshold else 0.0)

    if not scores:
        return 0.0

    avg = sum(scores) / len(scores)
    return round(avg, 3)
