import os
import json
import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from openai import OpenAI

from ..auth.auth import require_role
from ..database.recruiter_chat import RecruiterChatDB
from ..database.jobrole import JobRoleDB
from ..database.candidate import CandidateDB

router = APIRouter(prefix="/chat", tags=["chat"])
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def _json_safe(obj):
    if isinstance(obj, dict):
        return {k: _json_safe(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_json_safe(x) for x in obj]
    if isinstance(obj, datetime.datetime):
        return obj.isoformat()
    return obj

class ChatMessage(BaseModel):
    message: str


def _openai_reply(system_prompt, history, msg):
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": history + f"\nRecruiter: {msg}"}
        ],
        temperature=0.4
    )
    return resp.choices[0].message.content.strip()


@router.get("/list")
def list_chats(current_user=Depends(require_role("recruiter"))):
    chats = RecruiterChatDB.list_for_user(current_user["_id"])
    return {"ok": True, "chats": chats}


@router.post("/general")
def general_chat(body: ChatMessage, current_user=Depends(require_role("recruiter"))):
    chat = RecruiterChatDB.get_or_create_global_chat(current_user["_id"])
    history = RecruiterChatDB.format_chat_history(chat["_id"])

    system_prompt = """
You are RoleSync’s General Recruiter Assistant.
Be concise, professional, and accurate.
"""

    answer = _openai_reply(system_prompt, history, body.message)

    RecruiterChatDB.add_message(chat["_id"], "assistant", answer, "assistant")
    return {"ok": True, "response": answer}


@router.post("/contextual/{chat_id}")
def contextual_chat(chat_id: str, body: ChatMessage, current_user=Depends(require_role("recruiter"))):
    chat = RecruiterChatDB.get(chat_id)
    if not chat:
        raise HTTPException(404, "Chat not found")

    job = JobRoleDB.get(chat["job_role_id"])
    run_id = chat.get("run_id") 

    raw_analyses = CandidateDB.get_analysis_for_job_and_run(
        chat["job_role_id"],
        run_id
    )

    analyses = []
    for a in raw_analyses:
        cand = CandidateDB.get(a["candidate_id"])
        if not cand:
            continue

        analyses.append({
            "candidate_id": a["candidate_id"],
            "name": cand.get("name"),
            "email": cand.get("email"),
            "skills": cand.get("skills", []),
            "experience_years": cand.get("experience_years", 0),
            "projects": cand.get("projects", []),
            "match_score": a.get("match_score"),
            "ats_score": a.get("ats_score"),
            "decision": "rejected" if a.get("match_score", 0) < 45 else "shortlisted"
        })

    system_prompt = f"""
You are a contextual hiring assistant.

JOB:
{json.dumps(_json_safe(job), indent=2)}

CANDIDATES (CURRENT SHORTLIST RUN ONLY):
{json.dumps(_json_safe(analyses), indent=2)}

Answer recruiter queries precisely.
"""

    history = RecruiterChatDB.format_chat_history(chat_id)
    answer = _openai_reply(system_prompt, history, body.message)

    RecruiterChatDB.add_message(chat_id, "assistant", answer, "assistant")
    return {"ok": True, "response": answer}
