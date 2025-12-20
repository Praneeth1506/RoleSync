import json
from .llm_client import llm_generate

CURATED_RESOURCES = {
    "python": ["Intro to Python (freecodecamp)", "Automate the Boring Stuff"],
    "docker": ["Docker Docs", "Play with Docker"],
    "aws": ["AWS Cloud Practitioner", "AWS Hands-on Labs"],
    "machine learning": ["Andrew Ng ML", "Hands-On ML"],
    "sql": ["SQLBolt", "Mode SQL"],
    "fastapi": ["FastAPI Docs", "FastAPI YouTube"]
}

def _fallback_learning_path(skill_gaps, candidate_skills, target_role):
    priority = skill_gaps[:5]
    resources = {s: CURATED_RESOURCES.get(s.lower(), []) for s in priority}
    return {
        "priority": priority,
        "resources": resources,
        "projects": [],
        "estimated_time_weeks": max(2, len(priority) * 2)
    }

def generate_learning_path(skill_gaps, candidate_skills, target_role=None, use_llm=True):
    if not skill_gaps:
        return {"priority": [], "resources": {}, "projects": [], "estimated_time_weeks": 0}

    if not use_llm:
        return _fallback_learning_path(skill_gaps, candidate_skills, target_role)

    prompt = f"""
Generate a learning roadmap.

skill_gaps: {skill_gaps}
candidate_skills: {candidate_skills}
target_role: {target_role}

Return JSON:
{{ "priority": [...], "resources": {{}}, "projects": [...], "estimated_time_weeks": number }}
"""

    try:
        text = llm_generate(prompt)
        return json.loads(text[text.find("{"):text.rfind("}")+1])
    except Exception:
        return _fallback_learning_path(skill_gaps, candidate_skills, target_role)
