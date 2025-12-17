import json
from .llm_client import llm_generate


def answer_recruiter_query(query, history, job_role, candidates):
    history_text = ""
    for msg in history[-10:]:
        role = "Recruiter" if msg.get("sender") == "recruiter" else "Assistant"
        history_text += f"{role}: {msg.get('text', '')}\n"

    job_role_txt = json.dumps(job_role or {}, indent=2)
    cand_txt = json.dumps(candidates or [], indent=2)

    prompt = f"""
You are an AI recruitment assistant helping a recruiter evaluate candidates and make decisions.

Job Role (if provided):
{job_role_txt}

Top Candidates in context (if any):
{cand_txt}

Conversation History:
{history_text}

New recruiter message:
{query}

Your tasks:
- Understand the recruiter's intent.
- Use the job role and candidates context if available.
- Answer concretely and briefly.
- When appropriate, suggest next actions such as:
  - "shortlist candidate X"
  - "reject candidate Y"
  - "request more information"
  - "schedule interview"

Return ONLY valid JSON in this exact format:
{{
  "reply": "<your natural language response to recruiter>",
  "suggested_actions": ["action1", "action2"]
}}
"""

    try:
        text = llm_generate(prompt)

        if text.startswith("{"):
            return json.loads(text)

        start, end = text.find("{"), text.rfind("}")
        if start != -1 and end != -1:
            return json.loads(text[start:end + 1])

        raise ValueError("Invalid JSON from model")

    except Exception as e:
        print("LLM Parsing Error in recruiter_assistant:", e)
        return {
            "reply": "I couldn't process that request due to an internal error. Please try rephrasing or ask again.",
            "suggested_actions": [],
        }
