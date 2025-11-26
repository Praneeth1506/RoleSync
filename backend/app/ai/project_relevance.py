from difflib import SequenceMatcher
import re

def _clean(s: str):
    """Lowercase + trim + collapse whitespace."""
    return re.sub(r'\s+', ' ', (s or "").strip().lower())

def _similarity(a: str, b: str):
    """Compute fuzzy similarity between two strings."""
    return SequenceMatcher(None, _clean(a), _clean(b)).ratio()

def project_relevance_score(projects, responsibilities, threshold=0.35):
    """
    Computes how relevant candidate projects are to job responsibilities.
    - For each responsibility, find best similarity match among projects.
    - Below threshold is counted as zero relevance.
    """

    if not responsibilities:
        return 1.0  # If job has no responsibilities, candidate isn't penalized.

    if not projects:
        return 0.0  # Candidate has no projects.

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

        # Clamp low scores to zero
        scores.append(best if best >= threshold else 0.0)

    if not scores:
        return 0.0

    avg = sum(scores) / len(scores)
    return round(avg, 3)
