from fastapi import APIRouter, Depends, HTTPException
from ..auth.auth import require_role, get_current_user
from ..database.recruiter import RecruiterDB

router = APIRouter(prefix="/recruiter", tags=["recruiter"])


@router.get("/me")
def get_recruiter_profile(current_user = Depends(require_role("recruiter"))):

    recruiter = RecruiterDB.get(current_user["_id"])
    if not recruiter:
        raise HTTPException(404, "Recruiter profile not found")

    recruiter["_id"] = str(recruiter["_id"])

    return {
        "ok": True,
        "profile": recruiter
    }
