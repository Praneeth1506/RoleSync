import json
import datetime
import google.generativeai as genai
import os

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

MODEL = "gemini-2.5-pro"


def _json_safe(obj):
    if isinstance(obj, datetime.datetime):
        return obj.isoformat()

    if isinstance(obj, list):
        return [_json_safe(x) for x in obj]

    if isinstance(obj, dict):
        return {k: _json_safe(v) for k, v in obj.items()}

    return obj


def explain_semantic_fit(candidate, job_role):
    candidate_json = json.dumps(_json_safe(candidate), indent=2)
    job_json = json.dumps(_json_safe(job_role), indent=2)

    prompt = f"""
You are an expert hiring evaluator.

Provide a semantic explanation of candidate-to-job fit.

Candidate:
{candidate_json}

Job Role:
{job_json}

Return STRICT JSON ONLY:
{{
  "fit_summary": "2–3 sentences only",
  "strengths": [],
  "weaknesses": [],
  "reasoning_score": 0
}}
"""

    try:
        model = genai.GenerativeModel(MODEL)
        resp = model.generate_content(prompt)
        txt = resp.text.strip()

        s, e = txt.find("{"), txt.rfind("}")
        return json.loads(txt[s:e+1])

    except Exception as e:
        return {
            "fit_summary": "Semantic analysis failed.",
            "strengths": [],
            "weaknesses": [str(e)],
            "reasoning_score": 0
        }