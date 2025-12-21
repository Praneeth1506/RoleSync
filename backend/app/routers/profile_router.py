from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from ..auth.auth import require_role
from ..database.candidate import CandidateDB
from ..ai.resume_parser import parse_resume
import os
import tempfile
from ..utils.json_safe import json_safe

router = APIRouter(prefix="/api/profile", tags=["profile"])

@router.get("/")
async def get_profile(current_user=Depends(require_role("candidate"))):
    linked_id = current_user.get("linked_id")
    if not linked_id:
        return {"ok": True, "profile": None}

    candidate = CandidateDB.get(linked_id)
    if not candidate:
        return {"ok": True, "profile": None}

    minimal_profile = {
        "_id": candidate.get("_id"),
        "user_id": candidate.get("user_id"),
        "email": candidate.get("email"),
        "name": candidate.get("name"),
        "linkedin": candidate.get("linkedin"),
        "phone": candidate.get("phone"),
        "created_at": candidate.get("created_at"),
        "updated_at": candidate.get("updated_at"),
    }

    return {
        "ok": True,
        "profile": json_safe(minimal_profile)
    }


