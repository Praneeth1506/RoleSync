import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

JOB_ROLES = {
    "Machine Learning Engineer": {
        "required_skills": [
            "Python", "Machine Learning", "Deep Learning",
            "TensorFlow", "PyTorch", "Scikit-learn", "Data Preprocessing"
        ],
        "preferred_skills": ["NLP", "Computer Vision", "MLOps", "Model Deployment"]
    },

    "Data Analyst": {
        "required_skills": [
            "Python", "SQL", "Data Cleaning",
            "Pandas", "Excel", "Data Visualization"
        ],
        "preferred_skills": ["PowerBI", "Tableau", "Statistics", "A/B Testing"]
    },

    "Backend Developer": {
        "required_skills": [
            "Python", "FastAPI", "Node.js",
            "Databases", "API Development", "Authentication"
        ],
        "preferred_skills": ["Docker", "CI/CD", "Microservices", "Cloud Deployment"]
    },

    "Frontend Developer": {
        "required_skills": [
            "HTML", "CSS", "JavaScript", "React"
        ],
        "preferred_skills": ["Redux", "Tailwind", "UI Libraries", "Responsive Design"]
    },

    "Full Stack Developer": {
        "required_skills": [
            "React", "Node.js", "Python", "SQL", "API Development"
        ],
        "preferred_skills": ["Docker", "CI/CD", "Cloud Services", "Testing"]
    },

    "DevOps Engineer": {
        "required_skills": [
            "Linux", "Docker", "CI/CD",
            "GitHub Actions", "Kubernetes"
        ],
        "preferred_skills": ["Terraform", "AWS", "Monitoring Tools"]
    },

    "Cloud Engineer": {
        "required_skills": [
            "AWS", "Azure", "Cloud Architecture", "Networking"
        ],
        "preferred_skills": ["DevOps Tools", "Containers", "Load Balancing"]
    },

    "Mobile App Developer": {
        "required_skills": [
            "Flutter", "React Native", "Android", "iOS"
        ],
        "preferred_skills": ["Firebase", "Push Notifications"]
    },

    "UI/UX Designer": {
        "required_skills": [
            "Figma", "Wireframing", "Prototyping"
        ],
        "preferred_skills": ["User Research", "Illustration", "Brand Design"]
    },

    "Software Test Engineer": {
        "required_skills": [
            "Manual Testing", "Automation Testing", "Selenium"
        ],
        "preferred_skills": ["API Testing", "Performance Testing"]
    }
}

def detect_job_role(resume_text: str) -> str:
    roles_list = ", ".join(JOB_ROLES.keys())

    prompt = f"""
    Based on the following resume text, identify which one of these job roles 
    is the BEST MATCH:

    Roles:
    {roles_list}

    Resume:
    {resume_text}

    Respond with ONLY the job role name (exact text).
    """

    model = genai.GenerativeModel("gemini-2.5-flash")

    try:
        response = model.generate_content(prompt)
        role = response.text.strip()

        for r in JOB_ROLES.keys():
            if r.lower() in role.lower():
                return r

        return "Unknown"

    except Exception:
        return "Unknown"


def get_jd_for_role(role_name: str):
    """Return JD dict or fallback empty JD."""
    return JOB_ROLES.get(role_name, {"required_skills": [], "preferred_skills": []})
