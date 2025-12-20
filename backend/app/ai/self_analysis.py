import json
from datetime import datetime
from .llm_client import llm_generate
from .ats_scoring import compute_ats_score
from .match_score import compute_match_score
from .skill_gap import get_skill_gap
from .feedback import generate_feedback
from ..database.candidate import CandidateDB
from ..ai.learning_path import generate_learning_path


ROLE_SKILL_MAP = {
    "data analyst": {
        "required": ["SQL", "Excel", "Python", "Pandas", "Data Cleaning", "Data Visualization"],
        "preferred": ["Power BI", "Tableau", "Statistics", "A/B Testing", "Machine Learning"]
    },
    "data scientist": {
        "required": ["Python", "Statistics", "Pandas", "NumPy", "Machine Learning", "Model Evaluation"],
        "preferred": ["TensorFlow", "PyTorch", "Deep Learning", "NLP", "MLOps"]
    },
    "machine learning engineer": {
        "required": ["Python", "Machine Learning", "TensorFlow", "PyTorch", "Model Deployment"],
        "preferred": ["Docker", "FastAPI", "AWS", "MLOps", "Data Engineering"]
    }
}


def extract_skills_from_jd(jd_text: str):
    prompt = f"""
You are an ATS and HR skill extraction engine.

Extract HARD SKILLS ONLY from this Job Description:

{jd_text}

Return STRICT JSON ONLY in this format:
{{
    "required_skills": ["skill1", "skill2"],
    "preferred_skills": ["skill3", "skill4"]
}}
"""

    try:
        text = llm_generate(prompt)
        start, end = text.find("{"), text.rfind("}")
        return json.loads(text[start:end + 1])
    except Exception:
        return {
            "required_skills": ["Python", "Pandas", "NumPy", "SQL", "Machine Learning"],
            "preferred_skills": ["TensorFlow", "PyTorch", "Statistics"]
        }


def extract_skills_from_role(role_name: str):
    role_name = role_name.lower().strip()

    if role_name in ROLE_SKILL_MAP:
        return {
            "required_skills": ROLE_SKILL_MAP[role_name]["required"],
            "preferred_skills": ROLE_SKILL_MAP[role_name]["preferred"]
        }

    prompt = f"""
Predict HARD SKILLS required for the job role: "{role_name}"

Return STRICT JSON ONLY:
{{
    "required_skills": [...],
    "preferred_skills": [...]
}}
"""

    try:
        text = llm_generate(prompt)
        start, end = text.find("{"), text.rfind("}")
        return json.loads(text[start:end + 1])
    except Exception:
        return {
            "required_skills": ["Python", "SQL", "Data Analysis"],
            "preferred_skills": ["TensorFlow", "PyTorch"]
        }


def auto_detect_role(resume_text: str):
    prompt = f"""
Based on this resume text, identify the most suitable job role (2–4 words max):

{resume_text}

Return ONLY the role name.
"""

    try:
        return llm_generate(prompt).strip()
    except Exception:
        return "General Profile"


def run_self_analysis(user_id: str, jd_text: str = None, target_role: str = None):
    candidate = CandidateDB.find_by_user_id(user_id)
    if not candidate:
        return {"error": "Candidate profile not found."}

    resume_text = candidate.get("parsed_text", "")
    if not resume_text.strip():
        return {"error": "No resume uploaded."}

    parsed = {
        "name": candidate.get("name", ""),
        "email": candidate.get("email", ""),
        "skills": candidate.get("skills", []),
        "projects": candidate.get("projects", []),
        "experience_years": candidate.get("experience_years", 0),
        "raw_text": resume_text,
    }

    if jd_text:
        skill_info = extract_skills_from_jd(jd_text)
        detected_role = target_role or auto_detect_role(resume_text)
    else:
        detected_role = target_role or auto_detect_role(resume_text)
        skill_info = extract_skills_from_role(detected_role.lower())

    ats_score = compute_ats_score(resume_text, skill_info["required_skills"])

    match_result = compute_match_score(
        {
            "skills": parsed["skills"],
            "projects": parsed["projects"],
            "experience_years": parsed["experience_years"],
            "parsed_text": parsed["raw_text"]
        },
        {
            "title": detected_role,
            "required_skills": skill_info["required_skills"],
            "preferred_skills": skill_info["preferred_skills"],
            "parsed": {"raw_text": jd_text or ""}
        }
    )

    skill_gap = get_skill_gap(parsed["skills"], skill_info["required_skills"])

    learning_path = generate_learning_path(
        skill_gaps=skill_gap,
        candidate_skills=parsed["skills"],
        target_role=detected_role
    )
    try:
        feedback = generate_feedback(parsed, skill_info)
    except Exception as e:
        feedback = {"summary": "Feedback unavailable", "recommendations": [str(e)]}

    return {
        "parsed": parsed,
        "ats_score": ats_score,
        "match_score": match_result["score"],
        "skill_gap": skill_gap,
        "feedback": feedback,
        "auto_detected_role": detected_role,
        "learning_path": learning_path,
        "timestamp": datetime.utcnow().isoformat()
    }
