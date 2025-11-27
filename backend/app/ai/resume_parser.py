import fitz
import docx
import json
import google.generativeai as genai
from dotenv import load_dotenv
import os
from typing import Dict

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

def extract_text_from_pdf(file_path: str) -> str:
    text = ""
    try:
        doc = fitz.open(file_path)
        for page in doc:
            text += page.get_text("text")
    except Exception as e:
        print("PDF extraction error:", e)
    return text


def extract_text_from_docx(file_path: str) -> str:
    text = ""
    try:
        doc = docx.Document(file_path)
        for para in doc.paragraphs:
            text += para.text + "\n"
    except Exception as e:
        print("DOCX extraction error:", e)
    return text


def extract_text(file_path: str) -> str:
    file_ext = file_path.lower()
    if file_ext.endswith(".pdf"):
        return extract_text_from_pdf(file_path)
    elif file_ext.endswith(".docx"):
        return extract_text_from_docx(file_path)
    else:
        raise ValueError("Unsupported file format. Only PDF and DOCX allowed.")


def parse_resume_with_ai(text: str) -> Dict:
    prompt = f"""
You are a resume parsing assistant. Convert the following resume text into STRICT JSON with EXACT fields:

{{
  "name": "",
  "email": "",
  "phone": "",
  "skills": [],
  "education": [],
  "experience_years": 0,
  "projects": [],
  "raw_text": ""
}}

Rules:
- Return ONLY valid JSON.
- skills must be a list of strings.
- education: list of strings.
- projects: list of short strings.
- experience_years must be a number.
- raw_text must contain the full resume text.

Resume Text:
{text}
"""

    model = genai.GenerativeModel("gemini-2.5-flash")

    try:
        response = model.generate_content(prompt)
        output = ""
        if hasattr(response, "text") and response.text:
            output = response.text.strip()
        elif hasattr(response, "candidates") and response.candidates:
            first = response.candidates[0]
            output = getattr(first, "content", getattr(first, "text", str(first))).strip()

        if output.startswith("{"):
            parsed = json.loads(output)
            parsed["raw_text"] = text
            parsed.setdefault("skills", [])
            parsed.setdefault("education", [])
            parsed.setdefault("projects", [])
            parsed.setdefault("experience_years", 0)
            return parsed

        start = output.find("{")
        end = output.rfind("}")
        if start != -1 and end != -1:
            parsed = json.loads(output[start:end+1])
            parsed["raw_text"] = text
            parsed.setdefault("skills", [])
            parsed.setdefault("education", [])
            parsed.setdefault("projects", [])
            parsed.setdefault("experience_years", 0)
            return parsed

    except Exception as e:
        print("LLM Parsing Error:", e)

    return {
        "name": "",
        "email": "",
        "phone": "",
        "skills": [],
        "education": [],
        "experience_years": 0,
        "projects": [],
        "raw_text": text,
    }


def parse_resume(file_path: str) -> Dict:
    text = extract_text(file_path)
    if len(text.strip()) == 0:
        return {"error": "Could not extract text from file.", "raw_text": ""}
    return parse_resume_with_ai(text)
