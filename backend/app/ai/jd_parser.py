import json
import google.generativeai as genai
from dotenv import load_dotenv
import os
import re

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))


def parse_jd_with_ai(text):
    """
    Sends JD text to Gemini and extracts structured fields.
    """

    prompt = f"""
You are an expert HR job description parser. Read the following JD and extract structured information.

JD:
{text}

Return JSON in the exact format below:

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

Rules:
- "required_skills" = mandatory skills (MUST have)
- "preferred_skills" = good to have, bonus skills
- "seniority" = one of ["Junior", "Mid-Level", "Senior", "Lead", "Director"]
- "tech_stack" = list of programming languages, frameworks, tools
- Do NOT invent details. Extract only what is present.
- Keep the JSON valid.
"""

    model = genai.GenerativeModel("gemini-2.5-pro")

    try:
        resp = model.generate_content(prompt)
        return json.loads(resp.text)
    except Exception as e:
        print("JD Parsing Error:", e)
        return {
            "job_title": "",
            "role_summary": "",
            "required_skills": [],
            "preferred_skills": [],
            "responsibilities": [],
            "experience_level": "",
            "seniority": "",
            "tech_stack": []
        }


def parse_jd(file_path):
    """
    Read JD text from file (txt/pdf/docx).
    """

    ext = file_path.lower()

    if ext.endswith(".txt"):
        with open(file_path, "r", encoding="utf-8") as f:
            text = f.read()
    else:
        from .resume_parser import extract_text
        text = extract_text(file_path)

    if len(text.strip()) == 0:
        return {"error": "Could not extract JD text."}

    return parse_jd_with_ai(text)

def detect_seniority_and_experience(text):
    """
    Heuristic detection for seniority and numeric ideal_experience.
    Returns (seniority_str, ideal_experience_years_or_None)
    """
    txt = (text or "").lower()

    if re.search(r'\b(senior|sr\.?|lead|principal)\b', txt):
        seniority = "Senior"
    elif re.search(r'\b(mid|midsenior|associate)\b', txt):
        seniority = "Mid-Level"
    elif re.search(r'\b(junior|jr\.?|intern|trainee|fresher)\b', txt):
        seniority = "Junior"
    else:
        seniority = ""  

    match = re.search(r'(\d+)\s*\+\s*years', txt) or re.search(r'at least\s*(\d+)\s*years', txt)
    if not match:
        match = re.search(r'(\d+)\s*-\s*(\d+)\s*years', txt)
        if match:
            ideal_exp = int(match.group(1))
        else:
            match2 = re.search(r'(\d+)\s*years', txt)
            ideal_exp = int(match2.group(1)) if match2 else None
    else:
        ideal_exp = int(match.group(1))

    return seniority, ideal_exp
