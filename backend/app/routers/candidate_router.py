from fastapi import APIRouter, Depends, HTTPException
from ..auth.auth import require_role
from ..database.candidate import CandidateDB

router = APIRouter(prefix="/candidate", tags=["candidate"])

@router.get("/feedback")
def get_candidate_feedback(current_user = Depends(require_role("candidate"))):
    candidate = CandidateDB.get(current_user["_id"])
    if not candidate:
        raise HTTPException(404, "Candidate not found")

    feedback_list = candidate.get("feedback", [])

    formatted = []
    for fb in feedback_list:
        formatted.append({
            "job_role_id": str(fb.get("job_role_id")),
            "recruiter_id": str(fb.get("recruiter_id")),
            "feedback": fb.get("feedback"),
            "timestamp": fb.get("timestamp")
        })

    return {
        "ok": True,
        "count": len(formatted),
        "feedback": formatted
    }

@router.get("/feedback")
def get_candidate_feedback(current_user = Depends(require_role("candidate"))):
    cand = CandidateDB.get(current_user["_id"])
    return {
        "ok": True,
        "feedback": cand.get("final_feedback", [])
    }
