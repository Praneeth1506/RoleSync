# app/ai/interview_assistant.py
import json
import google.generativeai as genai
import os

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

model = genai.GenerativeModel("gemini-2.5-flash")

def interview_ai(query, history, role):
    """
    history shape:
    [
        {"sender": "candidate", "text": "..."},
        {"sender": "ai", "text": "..."},
    ]
    """

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
        response = model.generate_content(prompt)
        text = response.text.strip()
        obj = json.loads(text[text.find("{"):text.rfind("}")+1])
        return obj
    except Exception as e:
        return {
            "reply": "Sorry, I couldn’t process that.",
            "should_continue": True,
            "evaluation": "",
            "next_question": "Let's continue. Explain a recent project you built."
        }
