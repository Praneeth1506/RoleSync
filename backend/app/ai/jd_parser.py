import os
import json
from .resume_parser import extract_text
from .llm_client import llm_generate


def parse_jd(source: str) -> dict:
    jd_text = extract_text(source) if os.path.exists(source) else source

    if not jd_text.strip():
        return {}

    prompt = f"""
You are an ATS job description parsing engine.

JOB DESCRIPTION:
{jd_text}

Return STRICT JSON ONLY:
{{
  "job_title": "",
  "role_summary": "",
  "required_skills": [],
  "preferred_skills": [],
  "responsibilities": [],
  "experience_level": "",
  "seniority": "",
  "tech_stack": []
}}
"""

    try:
        text = llm_generate(prompt)
        start = text.find("{")
        end = text.rfind("}")
        data = json.loads(text[start:end + 1])
        data["raw_text"] = jd_text
        return data
    except Exception as e:
        print("JD parsing failed:", e)
        return {"raw_text": jd_text}
