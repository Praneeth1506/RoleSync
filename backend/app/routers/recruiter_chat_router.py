from fastapi import APIRouter, Form
from ..database.recruiter_chat import RecruiterChatDB
from ..database.recruiter_messages import RecruiterMessageDB
from ..ai.recruiter_assistant import answer_recruiter_query
from ..database.candidate import CandidateDB
from ..database.job_description import JobRoleDB

router = APIRouter(prefix="/api/ai/recruiter_chat", tags=["recruiter_chat"])

# -----------------------------------
# 1. Create Chat
# -----------------------------------
@router.post("/start")
async def start_chat(recruiter_id: str = Form(...), job_role_id: str = Form(...)):
    chat_id = RecruiterChatDB.create_chat(recruiter_id, job_role_id)
    return {"ok": True, "chat_id": chat_id}

# -----------------------------------
# 2. Send Message
# -----------------------------------
@router.post("/send")
async def send_message(chat_id: str = Form(...), message: str = Form(...)):

    chat = RecruiterChatDB.get_chat(chat_id)
    if not chat:
        return {"ok": False, "error": "Chat not found"}

    job_role = JobRoleDB.get(chat.get("job_role_id"))
    candidates = CandidateDB.get_top_n(chat.get("job_role_id"), n=10)

    history = RecruiterMessageDB.get_messages(chat_id)

    # Save recruiter message
    RecruiterMessageDB.add_message(chat_id, "recruiter", message)

    # AI response
    result = answer_recruiter_query(
        query=message,
        history=history,
        job_role=job_role,
        candidates=candidates
    )

    ai_reply = result.get("reply")

    # Save AI reply
    RecruiterMessageDB.add_message(chat_id, "ai", ai_reply)

    return {"ok": True, "reply": ai_reply, "suggested_actions": result.get("suggested_actions")}

# -----------------------------------
# 3. Load full chat history
# -----------------------------------
@router.get("/{chat_id}")
async def get_chat(chat_id: str):
    messages = RecruiterMessageDB.get_full_chat(chat_id)
    return {"ok": True, "messages": messages}
