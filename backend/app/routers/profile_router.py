from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from ..auth.auth import get_current_user, require_role
from ..database.candidate import CandidateDB
from ..database.user import get_user_by_id
from ..ai.resume_parser import parse_resume
import os

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
    
    # Don't send raw text to frontend to save bandwidth, unless needed
    # candidate.pop("parsed_text", None) 
    
    return {"ok": True, "profile": candidate}

@router.post("/resume")
async def update_resume(
    file: UploadFile = File(...),
    current_user = Depends(require_role("candidate"))
):
    """
    Upload and parse a new resume, updating the candidate profile.
    """
    linked_id = current_user.get("linked_id")
    if not linked_id:
        raise HTTPException(status_code=400, detail="User has no linked candidate profile.")

    temp_path = f"/tmp/{file.filename}"
    with open(temp_path, "wb") as f:
        f.write(await file.read())
    
    parsed = parse_resume(temp_path)
    
    try:
        os.remove(temp_path)
    except:
        pass
    
    if "error" in parsed:
        raise HTTPException(status_code=400, detail="Resume parsing failed")
    
    # Update the candidate document
    updated_candidate = CandidateDB.update_resume(linked_id, parsed)
    
    return {
        "ok": True,
        "message": "Resume updated successfully.",
        "profile": updated_candidate
    }
