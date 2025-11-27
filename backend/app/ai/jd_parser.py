import os
import json
from dotenv import load_dotenv
import google.generativeai as genai

from .resume_parser import extract_text  

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

MODEL_NAME = "gemini-2.5-flash"


def _fallback_parse(jd_text: str) -> dict:
    lines = [l.strip() for l in jd_text.splitlines() if l.strip()]

    responsibilities = []
    required_skills = []
    preferred_skills = []
    tech_stack = []

    current_section = None
    for line in lines:
        lower = line.lower()

        if "responsibilit" in lower or "duties" in lower:
            current_section = "responsibilities"
            continue
        if "qualification" in lower or "requirements" in lower:
            current_section = "required_skills"
            continue
        if "preferred" in lower or "nice to have" in lower:
            current_section = "preferred_skills"
            continue
        if "tech stack" in lower or "technology stack" in lower:
            current_section = "tech_stack"
            continue

        if current_section == "responsibilities":
            responsibilities.append(line)
        elif current_section == "required_skills":
            required_skills.append(line)
        elif current_section == "preferred_skills":
            preferred_skills.append(line)
        elif current_section == "tech_stack":
            tech_stack.append(line)

    return {
        "job_title": "",
        "role_summary": "",
        "required_skills": required_skills,
        "preferred_skills": preferred_skills,
        "responsibilities": responsibilities,
        "experience_level": "",
        "seniority": "",
        "tech_stack": tech_stack,
        "raw_text": jd_text,
    }

def _load_jd_text(source: str) -> str:
    if os.path.exists(source) and os.path.isfile(source):
        return extract_text(source)

    lowered = source.lower()
    if lowered.endswith(".pdf") or lowered.endswith(".docx"):
        return extract_text(source)

    return source

def parse_jd(source: str) -> dict:
    jd_text = _load_jd_text(source)

    if not jd_text or not jd_text.strip():
        return {
            "job_title": "",
            "role_summary": "",
            "required_skills": [],
            "preferred_skills": [],
            "responsibilities": [],
            "experience_level": "",
            "seniority": "",
            "tech_stack": [],
            "raw_text": "",
        }

    prompt = f"""
You are an ATS job description parsing engine.

Read the following Job Description and extract structured information.

JOB DESCRIPTION:
----------------
{jd_text}
----------------

Return STRICT JSON ONLY in this format:

{{
  "job_title": "string",
  "role_summary": "short paragraph (1–3 sentences)",
  "required_skills": ["skill1", "skill2", "..."],
  "preferred_skills": ["skill3", "skill4", "..."],
  "responsibilities": ["sentence 1", "sentence 2", "..."],
  "experience_level": "0-2 years / 3-5 years / 5+ years / Entry / Mid / Senior",
  "seniority": "Junior / Mid-level / Senior / Lead / Principal",
  "tech_stack": ["Python", "TensorFlow", "AWS"]
}}

IMPORTANT RULES:
- HARD SKILLS ONLY in required_skills and preferred_skills.
- responsibilities = bullet-like sentences.
- tech_stack = tools / platforms / frameworks.
- Return ONLY valid JSON with NO extra text.
    """

    try:
        model = genai.GenerativeModel(MODEL_NAME)
        response = model.generate_content(prompt)
        text = response.text.strip()

        try:
            data = json.loads(text)
        except:
            start = text.find("{")
            end = text.rfind("}")
            if start == -1 or end == -1:
                raise ValueError("No JSON object found in LLM output")
            data = json.loads(text[start:end + 1])

        required_keys = [
            "job_title", "role_summary",
            "required_skills", "preferred_skills",
            "responsibilities", "experience_level",
            "seniority", "tech_stack"
        ]
        for key in required_keys:
            data.setdefault(
                key,
                [] if key in ("required_skills", "preferred_skills", "responsibilities", "tech_stack") else ""
            )

        data["raw_text"] = jd_text
        return data

    except Exception as e:
        print("JD LLM Parsing Error:", e)
        fallback = _fallback_parse(jd_text)
        fallback["raw_text"] = jd_text
        return fallback
