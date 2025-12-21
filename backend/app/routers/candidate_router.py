from fastapi import APIRouter, Depends, HTTPException
from ..auth.auth import require_role
from ..database.candidate import CandidateDB
from ..database.feedback import FeedbackDB
from ..database.jobrole import JobRoleDB
from ..database.recruiter import RecruiterDB

router = APIRouter(prefix="/candidate", tags=["candidate"])


@router.get("/candidate/feedback")
def get_candidate_feedback(current_user=Depends(require_role("candidate"))):
    candidate = CandidateDB.find_by_user_id(current_user["_id"])
    if not candidate:
        raise HTTPException(404, "Candidate profile not found")

    feedback_list = FeedbackDB.list_for_candidate(candidate["_id"])

    results = []

    for fb in feedback_list:
        job = JobRoleDB.get(fb["job_role_id"])
        recruiter = RecruiterDB.get(fb["recruiter_id"])

        results.append({
            "feedback_id": str(fb["_id"]),
            "candidate_id": str(candidate["_id"]),   
            "feedback": fb.get("text"),            
            "status": fb.get("status"),
            "created_at": fb.get("created_at"),
            "job_role": job.get("title") if job else None,
            "company_name": job.get("company") if job else None
        })

    return {
        "ok": True,
        "feedback": results
    }
