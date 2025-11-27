import json
import os
import logging
from dotenv import load_dotenv
load_dotenv()

import google.generativeai as genai
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

logger = logging.getLogger("rolesync.ai.feedback")
logger.setLevel(logging.INFO)


def generate_feedback(parsed_resume: dict, jd_obj: dict):
    prompt = (
        "You are an expert recruitment evaluator. "
        "Analyze the candidate resume and job description.\n\n"

        "Resume (JSON):\n"
        f"{json.dumps(parsed_resume)}\n\n"

        "Job Description (JSON):\n"
        f"{json.dumps(jd_obj)}\n\n"

        "Return ONLY valid JSON with the following keys:\n"
        "{\n"
        "  \"summary\": \"string\",\n"
        "  \"match_score\": number (0-100),\n"
        "  \"missing_skills\": [list of strings],\n"
        "  \"recommendations\": [list of strings]\n"
        "}\n"
    )

    model = genai.GenerativeModel("gemini-2.5-flash")

    try:
        response = model.generate_content(
            prompt,
            generation_config={
                "response_mime_type": "application/json"
            }
        )
    except Exception as e:
        logger.exception("LLM call failed")
        raise RuntimeError(f"LLM call failed: {e}")

    try:
        return json.loads(response.text)
    except Exception:
        logger.error("Gemini returned non-JSON even in JSON mode: %r", response.text)
        return {"raw_text": response.text}
