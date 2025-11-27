import os
import re
import json
import datetime
from typing import Dict, Any
import google.generativeai as genai
from .project_relevance import project_relevance_score

_GENAI_KEY = os.getenv("GEMINI_API_KEY")
if _GENAI_KEY:
    try:
        genai.configure(api_key=_GENAI_KEY)
    except Exception:
        _GENAI_KEY = None

def parse_experience_to_int(exp):
    if exp is None:
        return None
    if isinstance(exp, (int, float)):
        return int(exp)
    text = str(exp).lower().strip()

    m = re.match(r"(\d+)\s*-\s*(\d+)", text)
    if m:
        a, b = map(int, m.groups())
        return (a + b) // 2

    m = re.match(r"(\d+)\s*\+", text)
    if m:
        return int(m.group(1))

    m = re.search(r"(\d+)", text)
    if m:
        return int(m.group(1))

    if "intern" in text or "entry" in text:
        return 0
    if "junior" in text:
        return 1
    if "mid" in text:
        return 3
    if "senior" in text:
        return 5
    if "lead" in text or "principal" in text:
        return 7

    return None


def _normalize_list(x):
    return [s.strip() for s in (x or []) if isinstance(s, str) and s.strip()]


def _safe_text(t, max_chars=2200):
    if not t:
        return ""
    s = t if isinstance(t, str) else json.dumps(t)
    return s[:max_chars]


def deterministic_score(candidate: Dict[str, Any], job_role: Dict[str, Any]):
    cand_sk = set(s.lower() for s in _normalize_list(candidate.get("skills")))
    req = [s.lower() for s in _normalize_list(job_role.get("required_skills"))]
    pref = [s.lower() for s in _normalize_list(job_role.get("preferred_skills"))]
    projects = _normalize_list(candidate.get("projects"))
    raw_text = (candidate.get("parsed_text") or candidate.get("raw_text") or "").lower()

    req_cov = round(100 * (sum(1 for r in req if r in cand_sk) / len(req)), 2) if req else 100.0
    pref_cov = round(100 * (sum(1 for p in pref if p in cand_sk) / len(pref)), 2) if pref else 100.0

    try:
        proj_score = round(project_relevance_score(projects, job_role.get("responsibilities", [])) * 100, 2)
    except Exception:
        proj_score = 0.0

    ideal = parse_experience_to_int(
        job_role.get("experience_level") or job_role.get("parsed", {}).get("experience_level")
    )
    cand_exp = candidate.get("experience_years") or 0
    if ideal is None or ideal <= 0:
        exp_score = 50.0
    else:
        exp_score = 100.0 if cand_exp >= ideal else round((cand_exp / ideal) * 100.0, 2)

    keys = req + pref
    if keys:
        semantic_hits = sum(1 for k in keys if k and k.lower() in raw_text)
        semantic_score = round(100 * (semantic_hits / len(keys)), 2)
    else:
        semantic_score = 50.0

    weights = {"required": 0.35, "preferred": 0.15, "semantic": 0.15, "projects": 0.2, "experience": 0.15}
    total = (
        req_cov * weights["required"]
        + pref_cov * weights["preferred"]
        + semantic_score * weights["semantic"]
        + proj_score * weights["projects"]
        + exp_score * weights["experience"]
    )

    return {
        "score": round(total, 2),
        "components": {
            "required_coverage": req_cov,
            "preferred_coverage": pref_cov,
            "semantic_fit": semantic_score,
            "project_relevance": proj_score,
            "experience_fit": exp_score
        },
        "explanations": [
            f"Required skill match: {req_cov}%",
            f"Preferred skill match: {pref_cov}%",
            f"Project relevance: {proj_score}%",
            f"Experience fit: {exp_score}%"
        ],
        "method": "deterministic"
    }


def gemini_score(candidate: Dict[str, Any], job_role: Dict[str, Any], model_name="gemini-2.5-pro"):
    if not _GENAI_KEY:
        raise RuntimeError("Gemini key not configured")

    cand_brief = {
        "name": candidate.get("name"),
        "skills": _normalize_list(candidate.get("skills")),
        "projects": _normalize_list(candidate.get("projects"))[:6],
        "experience_years": candidate.get("experience_years", 0),
        "resume_snippet": _safe_text(candidate.get("parsed_text", "") or candidate.get("raw_text", ""), 2000),
    }
    job_brief = {
        "title": job_role.get("title"),
        "required_skills": _normalize_list(job_role.get("required_skills")),
        "preferred_skills": _normalize_list(job_role.get("preferred_skills")),
        "responsibilities": _normalize_list(job_role.get("responsibilities"))[:12],
        "experience_level": job_role.get("experience_level") or job_role.get("parsed", {}).get("experience_level"),
        "jd_snippet": _safe_text(job_role.get("raw_text") or job_role.get("parsed", {}).get("raw_text", ""), 2000),
    }

    prompt = f"""
You are an expert hiring evaluator. Compare the candidate and the job role and return STRICT JSON only.

Candidate: {json.dumps(cand_brief)}
JobRole: {json.dumps(job_brief)}

Return JSON exactly with keys:
{{
  "score": number,                // overall 0..100
  "components": {{
     "required_coverage": number,
     "preferred_coverage": number,
     "semantic_fit": number,
     "project_relevance": number,
     "experience_fit": number
  }},
  "explanations": ["short bullet sentences only"]
}}
"""
    model = genai.GenerativeModel(model_name)
    resp = model.generate_content(prompt)
    text = resp.text.strip()

    s = text.find("{")
    e = text.rfind("}")
    if s == -1 or e == -1:
        raise ValueError("No JSON object in Gemini response")

    payload = json.loads(text[s:e+1])
    if "score" not in payload or "components" not in payload:
        raise ValueError("Gemini response missing required fields")

    payload["method"] = "gemini"
    payload["raw_llm_text"] = text[:2000]
    return payload


def compute_match_score(candidate: Dict[str, Any], job_role: Dict[str, Any], use_llm: bool = True) -> Dict[str, Any]:
    if not job_role.get("experience_level") and job_role.get("parsed", {}).get("experience_level"):
        job_role["experience_level"] = job_role["parsed"]["experience_level"]

    if use_llm and _GENAI_KEY:
        try:
            return gemini_score(candidate, job_role)
        except Exception as e:
            print("Gemini scoring failed, falling back:", str(e))

    return deterministic_score(candidate, job_role)
