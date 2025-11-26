# app/routers/chat_router.py

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

# Configure Gemini
if os.getenv("GEMINI_API_KEY"):
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))


# -----------------------------------------------------------
# Request models
# -----------------------------------------------------------
class ChatMessage(BaseModel):
    message: str

@router.get("/list")
def list_chats(current_user=Depends(require_role("recruiter"))):
    """
    Returns ALL chats of the recruiter:
      - General chat (type = "general")
      - Contextual shortlisting chats (type = "contextual")
    """

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

    # Sort newest at the top
    formatted.sort(key=lambda x: x.get("updated_at") or x.get("created_at"), reverse=True)

    return {
        "ok": True,
        "count": len(formatted),
        "chats": formatted
    }

# ===================================================================
# 🟦 GENERAL ASSISTANT BOT — /chat/general
# ===================================================================
@router.post("/general")
def general_chat(
    body: ChatMessage,
    current_user=Depends(require_role("recruiter"))
):
    """
    General recruiter assistant — no job context.
    Supports:
      - writing job descriptions
      - hiring strategy
      - interview questions
      - platform help
      - explaining candidate analysis (only if user provides context manually)
    """

    recruiter_id = current_user["_id"]
    msg = body.message.strip()

    # Load or create a global chat for this recruiter
    chat = RecruiterChatDB.get_or_create_global_chat(recruiter_id)
    chat_id = chat["_id"]

    # Store user message
    RecruiterChatDB.add_message(
        chat_id,
        sender=recruiter_id,
        text=msg,
        message_type="user",
        metadata={"source": "general"}
    )

    # Prepare model
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

    # Gemini call
    try:
        model = genai.GenerativeModel("gemini-2.5-pro")
        response = model.generate_content(
            system_prompt + "\n\n" + history + f"\nRecruiter: {msg}"
        )
        answer = response.text.strip()
    except Exception as e:
        answer = f"I'm having trouble responding right now. ({e})"

    # Save bot message
    RecruiterChatDB.add_message(
        chat_id,
        sender="assistant",
        text=answer,
        message_type="assistant",
        metadata={"source": "general"}
    )

    return {"ok": True, "chat_id": chat_id, "response": answer}


# ===================================================================
# 🟧 CONTEXTUAL SHORTLISTING BOT — /chat/contextual/{chat_id}
# ===================================================================
@router.post("/contextual/{chat_id}")
def contextual_chat(
    chat_id: str,
    body: ChatMessage,
    current_user=Depends(require_role("recruiter"))
):
    """
    Job-role-specific AI assistant.
    Activated only after shortlist_batch is done.

    The bot understands:
      - job role details
      - required and preferred skills
      - responsibilities
      - experience expectations
      - candidate analyses (match score, ATS, semantic)
      - shortlisted/rejected lists
      - chat history
    """

    recruiter_id = current_user["_id"]
    msg = body.message.strip()

    # Verify chat exists
    chat = RecruiterChatDB.get(chat_id)
    if not chat:
        raise HTTPException(404, "Chat not found")

    job_role_id = chat.get("job_role_id")
    if not job_role_id:
        raise HTTPException(400, "This chat is not a contextual shortlist chat.")

    # Job role data
    job = JobRoleDB.get(job_role_id)
    if not job:
        raise HTTPException(404, "Job role not found")

    # Load analyses for each candidate
    analyses = CandidateDB.get_analysis_for_job(job_role_id)

    # Store user message
    RecruiterChatDB.add_message(
        chat_id,
        sender=recruiter_id,
        text=msg,
        message_type="user",
        metadata={"source": "contextual", "job_role_id": job_role_id}
    )

    # Construct context
    history = RecruiterChatDB.format_chat_history(chat_id)

    # Prepare contextual system prompt
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

    # Gemini call
    try:
        model = genai.GenerativeModel("gemini-2.5-pro")
        llm_input = system_prompt + "\n\n" + history + f"\nRecruiter: {msg}"
        response = model.generate_content(llm_input)
        answer = response.text.strip()
    except Exception as e:
        answer = f"I'm having trouble responding contextually right now. ({e})"

    # Save bot message
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
