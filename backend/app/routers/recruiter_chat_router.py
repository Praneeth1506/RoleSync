import os
import datetime
import google.generativeai as genai

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..auth.auth import require_role
from ..database.recruiter_chat import RecruiterChatDB
from ..database.jobrole import JobRoleDB
from ..database.candidate import CandidateDB

router = APIRouter(prefix="/chat", tags=["chat"])

if os.getenv("GEMINI_API_KEY"):
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

class ChatMessage(BaseModel):
    message: str

@router.get("/list")
def list_chats(current_user=Depends(require_role("recruiter"))):
    recruiter_id = current_user["_id"]
    chats = RecruiterChatDB.list_for_user(recruiter_id)

    formatted = []

    for c in chats:
        last_message = None
        if c.get("messages"):
            last_message = c["messages"][-1]["text"]

        formatted.append({
            "chat_id": str(c["_id"]),
            "title": c.get("title"),
            "type": c.get("type"),
            "job_role_id": c.get("job_role_id"),
            "last_message": last_message,
            "updated_at": c.get("updated_at"),
            "created_at": c.get("created_at")
        })

    formatted.sort(key=lambda x: x.get("updated_at") or x.get("created_at"), reverse=True)

    return {
        "ok": True,
        "count": len(formatted),
        "chats": formatted
    }

@router.post("/general")
def general_chat(
    body: ChatMessage,
    current_user=Depends(require_role("recruiter"))
):

    recruiter_id = current_user["_id"]
    msg = body.message.strip()

    chat = RecruiterChatDB.get_or_create_global_chat(recruiter_id)
    chat_id = chat["_id"]

    RecruiterChatDB.add_message(
        chat_id,
        sender=recruiter_id,
        text=msg,
        message_type="user",
        metadata={"source": "general"}
    )

    history = RecruiterChatDB.format_chat_history(chat_id)

    system_prompt = """
You are RoleSync’s General Recruiter Assistant.
You help recruiters with:
- creating job descriptions
- improving hiring workflows
- answering recruiting questions
- explaining platform features
- suggesting interview questions
- giving hiring best practices

You DO NOT make up candidate-specific data.
You do NOT talk about job-role context unless provided explicitly by user.

Be concise, helpful, and professional.
"""

    try:
        model = genai.GenerativeModel("gemini-2.5-pro")
        response = model.generate_content(
            system_prompt + "\n\n" + history + f"\nRecruiter: {msg}"
        )
        answer = response.text.strip()
    except Exception as e:
        answer = f"I'm having trouble responding right now. ({e})"

    RecruiterChatDB.add_message(
        chat_id,
        sender="assistant",
        text=answer,
        message_type="assistant",
        metadata={"source": "general"}
    )

    return {"ok": True, "chat_id": chat_id, "response": answer}


@router.post("/contextual/{chat_id}")
def contextual_chat(
    chat_id: str,
    body: ChatMessage,
    current_user=Depends(require_role("recruiter"))
):

    recruiter_id = current_user["_id"]
    msg = body.message.strip()

    chat = RecruiterChatDB.get(chat_id)
    if not chat:
        raise HTTPException(404, "Chat not found")

    job_role_id = chat.get("job_role_id")
    if not job_role_id:
        raise HTTPException(400, "This chat is not a contextual shortlist chat.")

    job = JobRoleDB.get(job_role_id)
    if not job:
        raise HTTPException(404, "Job role not found")

    analyses = CandidateDB.get_analysis_for_job(job_role_id)

    RecruiterChatDB.add_message(
        chat_id,
        sender=recruiter_id,
        text=msg,
        message_type="user",
        metadata={"source": "contextual", "job_role_id": job_role_id}
    )

    history = RecruiterChatDB.format_chat_history(chat_id)

    system_prompt = f"""
You are RoleSync’s CONTEXTUAL SHORTLISTING ASSISTANT.

You strictly answer in the context of:
JOB TITLE: {job.get("title")}
REQUIRED SKILLS: {job.get("required_skills")}
PREFERRED SKILLS: {job.get("preferred_skills")}
RESPONSIBILITIES: {job.get("responsibilities")}
EXPERIENCE: {job.get("experience_min") or job.get("parsed", {}).get("experience_level")}

CANDIDATE ANALYSIS DATA:
{json.dumps(analyses, indent=2)}

Your tasks:
- Explain why a candidate was shortlisted or rejected
- Compare candidates
- Provide insights on match score, ATS, semantic fit
- Suggest improvements for candidates
- Provide interview questions for THIS specific role
- Summarize best-fit candidates
- Give strategic hiring advice ONLY for this job role

You MUST NOT:
- hallucinate candidate attributes
- talk about other job roles
- generate irrelevant answers

Be precise, structured, and recruiter-friendly.
"""

    try:
        model = genai.GenerativeModel("gemini-2.5-pro")
        llm_input = system_prompt + "\n\n" + history + f"\nRecruiter: {msg}"
        response = model.generate_content(llm_input)
        answer = response.text.strip()
    except Exception as e:
        answer = f"I'm having trouble responding contextually right now. ({e})"

    RecruiterChatDB.add_message(
        chat_id,
        sender="assistant",
        text=answer,
        message_type="assistant",
        metadata={"source": "contextual", "job_role_id": job_role_id}
    )

    return {
        "ok": True,
        "chat_id": chat_id,
        "job_role_id": job_role_id,
        "response": answer
    }
