from fastapi import APIRouter, Depends, HTTPException
from ..auth.auth import require_role, get_current_user
from ..database.recruiter import RecruiterDB

router = APIRouter(prefix="/recruiter", tags=["recruiter"])

@router.get("/me")
def get_recruiter_profile(current_user=Depends(require_role("recruiter"))):

    recruiter = RecruiterDB.get_by_user_id(current_user["_id"])
    if not recruiter:
        raise HTTPException(404, "Recruiter profile not found")

    return {
        "ok": True,
        "profile": {
            "user_id": current_user["_id"],
            "name": current_user.get("name"),
            "email": current_user.get("email"),
            "company_name": recruiter.get("company_name"),
            "linkedin": recruiter.get("linkedin"),
            "phone": recruiter.get("phone"),
            "resume": recruiter.get("resume"),
            "created_at": recruiter.get("created_at"),
            "updated_at": recruiter.get("updated_at"),
        }
    }
