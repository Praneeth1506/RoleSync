import json
import os
from dotenv import load_dotenv
import google.generativeai as genai
load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

def explain_semantic_fit(candidate, job_role):
    """
    candidate: parsed candidate dict
    job_role: parsed job role dict
    Returns JSON with strengths, weaknesses and fit_score (0-100)
    """
    prompt = f"""
You are an expert hiring advisor. Compare candidate and job role.
Candidate: {json.dumps(candidate)}
JobRole: {json.dumps(job_role)}
Provide JSON: {{"fit_score":0,"strengths":[],"weaknesses":[],"recommendations": []}}
Score 0-100 and be concise. Return JSON only.
"""
    model = genai.GenerativeModel("gemini-2.5-pro")
    resp = model.generate_content(prompt)
    try:
        return json.loads(resp.text)
    except Exception:
        return {"raw": resp.text}
