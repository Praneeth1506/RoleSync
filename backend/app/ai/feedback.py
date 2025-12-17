import json
import logging
from .llm_client import llm_generate

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

    try:
        text = llm_generate(prompt)
        start = text.find("{")
        end = text.rfind("}")
        return json.loads(text[start:end + 1])
    except Exception as e:
        logger.exception("LLM feedback generation failed")
        return {
            "summary": "Feedback unavailable",
            "match_score": 0,
            "missing_skills": [],
            "recommendations": []
        }
