# app/routers/interview_router.py
import json
from fastapi import APIRouter, Depends, Form, HTTPException
from ..auth.auth import get_current_user, require_role
from ..database.interview_chat import InterviewChatDB
from ..ai.interview_assistant import interview_ai

router = APIRouter(prefix="/interview", tags=["interview"])


# -----------------------------
#  LIST ALL SESSIONS (STATIC)
#  MUST COME BEFORE DYNAMIC ROUTES
# -----------------------------
@router.get("/list")
def list_interview_sessions(
    current_user = Depends(require_role("candidate"))
):
    sessions = InterviewChatDB.list_for_candidate(current_user["_id"])
    return {"ok": True, "sessions": sessions}


# -----------------------------
#  START INTERVIEW SESSION
# -----------------------------
@router.post("/start")
def start_interview_session(
    target_role: str = Form(...),
    current_user = Depends(require_role("candidate"))
):
    session = InterviewChatDB.create_session(
        candidate_id=current_user["_id"],
        target_role=target_role
    )
    return {"ok": True, "session": session}



# -----------------------------
#  SEND MESSAGE IN INTERVIEW
# -----------------------------
@router.post("/{session_id}/message")
def send_interview_message(
    session_id: str,
    text: str = Form(...),
    current_user = Depends(require_role("candidate"))
):
    chat = InterviewChatDB.get(session_id)
    if not chat:
        raise HTTPException(404, "Interview session not found")

    InterviewChatDB.add_message(session_id, "candidate", text)

    # Build history
    history = [
        {"sender": m["sender"], "text": m["text"]}
        for m in chat["messages"]
    ]

    # AI response
    ai_result = interview_ai(text, history, chat.get("target_role", ""))

    InterviewChatDB.add_message(
        session_id,
        "ai",
        ai_result.get("reply", ""),
        metadata={
            "evaluation": ai_result.get("evaluation"),
            "next_question": ai_result.get("next_question")
        }
    )

    return {"ok": True, "ai": ai_result}



# -----------------------------
#  GET PARTICULAR SESSION
#  KEEP THIS AT VERY BOTTOM
# -----------------------------
@router.get("/{session_id}")
def get_interview_session(
    session_id: str,
    current_user = Depends(require_role("candidate"))
):
    chat = InterviewChatDB.get(session_id)
    if not chat:
        raise HTTPException(404, "Session not found")
    return {"ok": True, "chat": chat}
