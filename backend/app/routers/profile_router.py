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


@router.post("/resume")
async def update_resume(
    file: UploadFile = File(...),
    current_user = Depends(require_role("candidate"))
):
    linked_id = current_user.get("linked_id")
    if not linked_id:
        raise HTTPException(status_code=400, detail="User has no linked candidate profile.")

    ext = os.path.splitext(file.filename)[1] or ".txt"
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        tmp.write(await file.read())
        temp_path = tmp.name

    parsed = parse_resume(temp_path)

    try:
        os.remove(temp_path)
    except Exception:
        pass

    if not parsed or "error" in parsed:
        raise HTTPException(status_code=400, detail="Resume parsing failed")

    updated_candidate = CandidateDB.update_resume(linked_id, parsed)

    return {
        "ok": True,
        "message": "Resume updated successfully.",
        "profile": updated_candidate
    }

