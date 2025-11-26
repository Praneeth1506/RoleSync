# app/routers/invite_router.py
from fastapi import APIRouter, Depends, Form, HTTPException
from ..auth.auth import require_role, get_current_user
from ..database.invite import InviteDB
from ..database.candidate import CandidateDB

router = APIRouter(prefix="/invite", tags=["invite"])


@router.post("/send")
def send_invite(
    email: str = Form(...),
    candidate_id: str = Form(...),
    job_role_id: str = Form(...),
    current_user=Depends(require_role("recruiter"))
):
    """
    Recruiter sends invite to a candidate who is NOT registered.
    """
    # Must be a valid temporary candidate profile
    candidate = CandidateDB.get(candidate_id)
    if not candidate:
        raise HTTPException(404, "Candidate not found")

    inv = InviteDB.create_invite(
        email=email,
        candidate_temp_id=candidate_id,
        recruiter_id=current_user["_id"],
        job_role_id=job_role_id
    )

    invite_link = f"https://your-frontend.com/signup?invite={inv['token']}"

    return {
        "ok": True,
        "invite_link": invite_link,
        "token": inv["token"]
    }


@router.get("/info/{token}")
def get_invite_info(token: str):
    """
    Frontend calls this to display invite details before signup.
    """
    inv = InviteDB.get_by_token(token)
    if not inv:
        raise HTTPException(404, "Invalid invite token")

    if inv.get("is_used"):
        raise HTTPException(400, "This invite has already been used")

    return {"ok": True, "invite": inv}
