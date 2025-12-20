import json
from .llm_client import llm_generate

def interview_ai(query, history, role):
    history_text = ""
    for msg in history[-12:]:
        role_name = "Candidate" if msg["sender"] == "candidate" else "Assistant"
        history_text += f"{role_name}: {msg['text']}\n"

    prompt = f"""
You are an expert technical interviewer for the role '{role}'.

You conduct interviews in this structure:
1. Ask a relevant question (technical / HR / scenario)
2. If candidate responded previously, evaluate answer briefly
3. Continue with next question
4. Maintain context with full conversation history

Conversation history:
{history_text}

Candidate's new answer or request:
{query}

Respond ONLY in JSON format:
{{
  "reply": "<your next question or evaluation>",
  "should_continue": true,
  "evaluation": "<short feedback on last answer>",
  "next_question": "<next question to ask>"
}}
"""


    try:
        text = llm_generate(prompt, temperature=0.4)
        start = text.find("{")
        end = text.rfind("}")
        return json.loads(text[start:end + 1])
    except Exception:
        return {
            "reply": "Let's continue.",
            "should_continue": True,
            "evaluation": "",
            "next_question": "Explain a recent project you worked on."
        }
