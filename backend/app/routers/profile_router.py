from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from ..auth.auth import require_role
from ..database.candidate import CandidateDB
from ..ai.resume_parser import parse_resume
import os
import tempfile

router = APIRouter(prefix="/api/profile", tags=["profile"])


@router.get("/")
async def get_profile(current_user = Depends(require_role("candidate"))):
    """
    Get the current candidate's profile, including resume details.
    """
    linked_id = current_user.get("linked_id")
    if not linked_id:
        return {"ok": True, "profile": None, "message": "No candidate profile linked."}
    
    candidate = CandidateDB.get(linked_id)
    if not candidate:
        return {"ok": True, "profile": None, "message": "Candidate profile not found."}
    
    return {"ok": True, "profile": candidate}


