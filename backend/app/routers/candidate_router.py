from fastapi import APIRouter, Depends, HTTPException
from ..auth.auth import require_role
from ..database.candidate import CandidateDB
from ..database.feedback import FeedbackDB

router = APIRouter(prefix="/candidate", tags=["candidate"])

@router.get("/candidate/feedback")
def get_feedback(current_user=Depends(require_role("candidate"))):
    candidate = CandidateDB.find_by_user_id(current_user["_id"])
    if not candidate:
        raise HTTPException(404, "Candidate profile not found")

    feedback = FeedbackDB.list_for_candidate(candidate["_id"])
    return {"ok": True, "feedback": feedback}

