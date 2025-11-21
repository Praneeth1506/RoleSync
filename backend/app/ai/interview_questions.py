import json
import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

def generate_interview_questions(candidate, job_role):
    prompt = f"""
    Generate interview questions for this candidate applying for this job role.

    Candidate Skills:
    {candidate.get("skills", [])}

    Projects:
    {candidate.get("projects", [])}

    Job Requirements:
    {job_role.get("required_skills", [])}

    Give:
    - technical questions
    - project questions
    - behavioral questions
    - improvement tips
    Return JSON only.
    """

    model = genai.GenerativeModel("gemini-2.5-pro")
    response = model.generate_content(prompt)
    return json.loads(response.text)
