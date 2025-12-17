import json
from .llm_client import llm_generate

def generate_interview_questions(candidate, job_role):
    prompt = f"""
Generate interview questions for this candidate.

Candidate Skills:
{candidate.get("skills", [])}

Projects:
{candidate.get("projects", [])}

Job Requirements:
{job_role.get("required_skills", [])}

Return JSON ONLY with:
- technical_questions
- project_questions
- behavioral_questions
- improvement_tips
"""

    text = llm_generate(prompt)
    start = text.find("{")
    end = text.rfind("}")
    return json.loads(text[start:end + 1])
