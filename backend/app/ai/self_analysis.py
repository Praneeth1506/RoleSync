# app/ai/self_analysis.py
import json
import google.generativeai as genai
from datetime import datetime
import os
from dotenv import load_dotenv

from .ats_scoring import compute_ats_score
from .match_score import compute_match_score
from .skill_gap import get_skill_gap
from .feedback import generate_feedback
from ..database.candidate import CandidateDB

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# -----------------------------------------------------------
# Predefined Job Role Skill Map
# -----------------------------------------------------------
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
    },
    "ai engineer": {
        "required": ["Python", "Deep Learning", "TensorFlow", "PyTorch", "Computer Vision", "NLP"],
        "preferred": ["Transformers", "Reinforcement Learning", "HuggingFace", "MLOps"]
    },
    "frontend developer": {
        "required": ["HTML", "CSS", "JavaScript", "React", "Responsive Design"],
        "preferred": ["TypeScript", "Redux", "TailwindCSS", "Figma", "Next.js"]
    },
    "backend developer": {
        "required": ["Python", "Node.js", "REST APIs", "Databases", "Authentication"],
        "preferred": ["FastAPI", "Express.js", "Docker", "Redis", "Microservices"]
    },
    "full stack developer": {
        "required": ["HTML", "CSS", "JavaScript", "React", "Node.js"],
        "preferred": ["MongoDB", "SQL", "Express", "Docker", "CI/CD"]
    },
    "software engineer": {
        "required": ["Data Structures", "Algorithms", "Problem Solving", "Python", "Java"],
        "preferred": ["System Design", "Databases", "OOP", "Version Control"]
    },
    "mobile app developer": {
        "required": ["Flutter", "Dart", "React Native", "UI/UX", "API Integration"],
        "preferred": ["Firebase", "State Management", "Android/iOS Deployment"]
    },
    "devops engineer": {
        "required": ["Linux", "Git", "CI/CD", "Docker", "Kubernetes"],
        "preferred": ["Terraform", "AWS", "Monitoring", "Cloud Networking"]
    },
    "cloud engineer": {
        "required": ["AWS", "Azure", "GCP", "Linux", "Networking"],
        "preferred": ["Terraform", "DevOps", "Kubernetes", "Serverless"]
    },
    "cybersecurity analyst": {
        "required": ["Networking", "Linux", "Security Fundamentals", "Vulnerability Analysis"],
        "preferred": ["SIEM Tools", "Penetration Testing", "Cloud Security"]
    },
    "product manager": {
        "required": ["Communication", "User Research", "Roadmapping", "Analytics"],
        "preferred": ["SQL", "A/B Testing", "Project Management", "Figma"]
    },
    "ui ux designer": {
        "required": ["Figma", "Wireframing", "Prototyping", "User Research"],
        "preferred": ["Design Systems", "User Testing", "Front-end Basics"]
    },
    "business analyst": {
        "required": ["Excel", "SQL", "Requirement Gathering", "Documentation"],
        "preferred": ["Power BI", "Dashboards", "Process Automation"]
    }
}


# -----------------------------------------------------------
# Extract skills from raw JD file using LLM
# -----------------------------------------------------------
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

    Rules:
    - Return at least 5 required skills
    - Skills MUST be actual technical skills, not soft skills
    - Avoid generic words like 'good', 'experience', 'knowledge'
    """

    model = genai.GenerativeModel("gemini-2.5-flash")

    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1:
            return json.loads(text[start:end + 1])
        raise ValueError("Invalid JSON returned")
    except Exception:
        return {
            "required_skills": ["Python", "Pandas", "NumPy", "SQL", "Machine Learning"],
            "preferred_skills": ["TensorFlow", "PyTorch", "Statistics", "Data Visualization"]
        }


# -----------------------------------------------------------
# Extract skills from role name
# -----------------------------------------------------------
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

    Rules:
    - At least 5 required skills
    - At least 3 preferred skills
    - HARD SKILLS ONLY (technical skills)
    """

    model = genai.GenerativeModel("gemini-2.5-flash")
    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1:
            return json.loads(text[start:end + 1])
        raise ValueError("Invalid JSON returned")
    except Exception:
        return {
            "required_skills": ["Python", "SQL", "Data Analysis", "Statistics", "Machine Learning"],
            "preferred_skills": ["TensorFlow", "PyTorch", "Deep Learning"]
        }


# -----------------------------------------------------------
# Auto-detect role from resume text  ✅ FIXED
# -----------------------------------------------------------
def auto_detect_role(resume_text: str):
    prompt = f"""
    Based on this resume text, identify the most suitable job role (2–4 words max):

    {resume_text}

    Return ONLY the role name, e.g. "Data Scientist" or "Frontend Developer".
    """

    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception:
        return "General Profile"


# -----------------------------------------------------------
# MAIN SELF-ANALYSIS LOGIC (uses candidate profile, not files)
# -----------------------------------------------------------
def run_self_analysis(user_id: str, jd_text: str = None, target_role: str = None):
    """
    Self-analysis pipeline:

    - Fetch candidate profile using user_id
    - Use stored parsed resume text + skills
    - Skill source priority:
        1) JD file text (jd_text)
        2) Explicit target_role
        3) Auto-detected from resume
    """

    candidate = CandidateDB.find_by_user_id(user_id)
    if not candidate:
        return {"error": "Candidate profile not found. Please complete signup."}

    resume_text = candidate.get("parsed_text", "") or ""
    if not resume_text.strip():
        return {"error": "No resume found in profile. Please upload your resume first."}

    parsed = {
        "name": candidate.get("name", ""),
        "email": candidate.get("email", ""),
        "phone": candidate.get("phone", ""),
        "skills": candidate.get("skills", []),
        "education": candidate.get("education", []),
        "experience_years": candidate.get("experience_years", 0),
        "projects": candidate.get("projects", []),
        "raw_text": resume_text,
    }

    candidate_skills = parsed.get("skills", [])

    # Determine skill source: JD > target_role > auto-detect
    if jd_text:
        skill_info = extract_skills_from_jd(jd_text)
        detected_role = target_role or auto_detect_role(resume_text)
    elif target_role:
        skill_info = extract_skills_from_role(target_role)
        detected_role = target_role
    else:
        detected_role = auto_detect_role(resume_text)
        skill_info = extract_skills_from_role(detected_role.lower())

    required = skill_info.get("required_skills", [])
    preferred = skill_info.get("preferred_skills", [])

    ats_score = compute_ats_score(resume_text, required)
    match_score = compute_match_score(candidate_skills, required, preferred)
    skill_gap = get_skill_gap(candidate_skills, required)

    try:
        feedback = generate_feedback(parsed, skill_info)
    except Exception as e:
        feedback = {
            "summary": "AI feedback unavailable.",
            "recommendations": [str(e)],
        }

    learning_path = {
        "next_steps": [f"Learn: {skill}" for skill in skill_gap]
    }

    return {
        "parsed": parsed,
        "ats_score": ats_score,
        "match_score": match_score,
        "skill_gap": skill_gap,
        "feedback": feedback,
        "learning_path": learning_path,
        "auto_detected_role": detected_role,
        "timestamp": datetime.utcnow().isoformat(),
    }
