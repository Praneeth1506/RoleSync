import json
import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

CURATED_RESOURCES = {
    "python": ["Intro to Python (freecodecamp)", "Automate the Boring Stuff (book)"],
    "docker": ["Docker Get Started (docs.docker.com)", "Play with Docker labs"],
    "aws": ["AWS Cloud Practitioner Essentials (free)", "AWS Hands-on Labs"],
    "machine learning": ["Andrew Ng ML course (Coursera)", "Hands-On ML with Scikit-Learn"],
    "sql": ["Mode SQL Tutorial", "SQLBolt interactive lessons"],
    "fastapi": ["FastAPI official tutorial", "Build APIs with FastAPI (YouTube)"]
}

def _fallback_learning_path(skill_gaps, candidate_skills, target_role):
    """Local simple planner using curated resources."""
    priority = skill_gaps[:5]
    resources = {}
    for s in priority:
        key = s.lower()
        resources[s] = CURATED_RESOURCES.get(key, [f"Search tutorial for {s} on Coursera/Udemy/YouTube"])
    projects = [f"Build a small project using {priority[0]}" ] if priority else []
    return {
        "priority": priority,
        "resources": resources,
        "projects": projects,
        "estimated_time_weeks": max(2, len(priority) * 2)
    }

def generate_learning_path(skill_gaps, candidate_skills, target_role=None, use_llm=True):
    """
    Returns a learning path dictionary.
    - Attempts to use Gemini for a richer plan when use_llm True.
    - Falls back to curated local plan on failure.
    """
    if not skill_gaps:
        return {"priority": [], "resources": {}, "projects": [], "estimated_time_weeks": 0}

    if not use_llm:
        return _fallback_learning_path(skill_gaps, candidate_skills, target_role)

    prompt = f"""
You are an experienced career coach and curriculum designer.

Input:
- skill_gaps: {skill_gaps}
- candidate_skills: {candidate_skills}
- target_role: {target_role}

Produce a concise JSON with keys:
{{ "priority": [...], "resources": {{"skill": ["short title or link", ...]}}, "projects": [...], "estimated_time_weeks": <int> }}

Give 2-3 prioritized skills, 2 resources per skill (short title only), 2-3 small project suggestions, and a realistic estimated time in weeks.

Return JSON only.
"""
    try:
        model = genai.GenerativeModel("gemini-2.5-pro")
        resp = model.generate_content(prompt)
        out = json.loads(resp.text)
        for k in ("priority", "resources", "projects", "estimated_time_weeks"):
            if k not in out:
                return _fallback_learning_path(skill_gaps, candidate_skills, target_role)
        return out
    except Exception as e:
        return _fallback_learning_path(skill_gaps, candidate_skills, target_role)
