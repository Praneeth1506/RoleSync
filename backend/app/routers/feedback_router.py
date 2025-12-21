from fastapi import APIRouter, Depends, HTTPException, Form
from ..auth.auth import require_role
from ..database.feedback import FeedbackDB
from ..database.candidate import CandidateDB
from ..database.jobrole import JobRoleDB
from bson import ObjectId

router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.post("/draft")
def feedback_create_draft(
    candidate_id: str = Form(...),
    job_role_id: str = Form(...),
    feedback_text: str = Form(...),
    current_user = Depends(require_role("recruiter"))
):
    draft = FeedbackDB.create_draft(
        candidate_id=candidate_id,
        recruiter_id=current_user["_id"],
        job_role_id=job_role_id,
        feedback_text=feedback_text
    )
    return {"ok": True, "draft": draft}


@router.get("/pending")
def feedback_list_pending(current_user = Depends(require_role("recruiter"))):
    drafts = FeedbackDB.list_pending(current_user["_id"])
    return {"ok": True, "pending": drafts}


@router.put("/edit/{draft_id}")
def feedback_edit_draft(
    draft_id: str,
    new_text: str = Form(...),
    current_user = Depends(require_role("recruiter"))
):
    draft = FeedbackDB.get(draft_id)
    if not draft or draft["recruiter_id"] != current_user["_id"]:
        raise HTTPException(404, "Draft not found")

    updated = FeedbackDB.update_draft(draft_id, new_text)
    
    if updated:
        updated["_id"] = str(updated["_id"])
        updated["recruiter_id"] = str(updated["recruiter_id"])
        if "candidate_id" in updated: updated["candidate_id"] = str(updated["candidate_id"])
        if "job_role_id" in updated: updated["job_role_id"] = str(updated["job_role_id"])
    
    return {"ok": True, "draft": updated}


@router.post("/approve/{draft_id}")
def feedback_approve(
    draft_id: str,
    current_user = Depends(require_role("recruiter"))
):
    draft = FeedbackDB.get(draft_id)

    if not draft:
        raise HTTPException(404, "Draft not found")

    if draft["recruiter_id"] != current_user["_id"]:
        raise HTTPException(403, "Not authorized")

    FeedbackDB.approve_draft(draft_id)

    CandidateDB.add_final_feedback(
        draft["candidate_id"],
        draft["job_role_id"],
        draft["text"]
    )

    return {"ok": True, "message": "Feedback approved and sent to candidate"}

@router.post("/reject_remaining/{job_role_id}")
def reject_remaining_candidates(
    job_role_id: str,
    current_user=Depends(require_role("recruiter"))
):
    count = FeedbackDB.reject_remaining_for_job(
        recruiter_id=current_user["_id"],
        job_role_id=job_role_id
    )

    return {
        "ok": True,
        "rejected_count": count,
        "message": f"{count} candidates rejected successfully"
    }
