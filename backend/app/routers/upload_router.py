from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from datetime import datetime
import os
import tempfile

from ..auth.auth import require_role, get_current_user
from ..database.candidate import CandidateDB
from ..database.recruiter import RecruiterDB
from ..ai.resume_parser import parse_resume

router = APIRouter(prefix="/upload", tags=["upload"])


@router.post("/profile/upload_resume")
async def candidate_upload_resume(
    file: UploadFile = File(...),
    current_user=Depends(require_role("candidate"))
):
    candidate_id = current_user.get("linked_id")
    if not candidate_id:
        raise HTTPException(status_code=400, detail="Candidate profile not linked to user.")

    ext = os.path.splitext(file.filename)[1] or ".pdf"
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        tmp.write(await file.read())
        temp_path = tmp.name

    parsed = parse_resume(temp_path)

    try:
        os.remove(temp_path)
    except Exception:
        pass

    if not parsed or "error" in parsed:
        raise HTTPException(status_code=400, detail="Resume parsing failed.")

    CandidateDB.update_parsed_resume(candidate_id, parsed)

    return {
        "ok": True,
        "message": "Resume uploaded successfully.",
        "parsed": parsed
    }


@router.post("/recruiter/upload_resume")
async def recruiter_upload_resume(
    file: UploadFile = File(...),
    current_user=Depends(require_role("recruiter"))
):
    recruiter_id = current_user.get("linked_id")
    if not recruiter_id:
        raise HTTPException(status_code=400, detail="Recruiter profile not linked to user.")

    ext = os.path.splitext(file.filename)[1] or ".pdf"
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        tmp.write(await file.read())
        temp_path = tmp.name

    parsed = parse_resume(temp_path)

    try:
        os.remove(temp_path)
    except Exception:
        pass

    if not parsed or "error" in parsed:
        raise HTTPException(status_code=400, detail="Resume parsing failed.")

    RecruiterDB.update_resume(recruiter_id, parsed)

    return {
        "ok": True,
        "message": "Recruiter resume uploaded.",
        "parsed": parsed
    }


@router.post("/temp")
async def upload_temp_file(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user)
):
    ext = os.path.splitext(file.filename)[1] or ".tmp"
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        tmp.write(await file.read())
        temp_path = tmp.name

    return {
        "ok": True,
        "file_path": temp_path,
        "message": "File uploaded temporarily."
    }
