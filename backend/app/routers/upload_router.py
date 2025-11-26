# app/routers/upload_router.py

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from datetime import datetime
import os

from ..auth.auth import require_role, get_current_user
from ..database.candidate import CandidateDB
from ..database.recruiter import RecruiterDB
from ..ai.resume_parser import parse_resume

router = APIRouter(prefix="/upload", tags=["upload"])


# -------------------------------------------------------------
# 1️⃣ CANDIDATE — Upload Resume (profile resume upload)
# -------------------------------------------------------------
@router.post("/profile/upload_resume")
async def candidate_upload_resume(
    file: UploadFile = File(...),
    current_user=Depends(require_role("candidate"))
):
    """
    Candidate uploads OR updates resume in their profile.
    Saves parsed resume fields inside CandidateDB.
    """

    candidate_id = current_user.get("linked_id")
    if not candidate_id:
        raise HTTPException(status_code=400, detail="Candidate profile not linked to user.")

    # Save temp file
    temp_path = f"/tmp/{current_user['_id']}_{file.filename}"
    with open(temp_path, "wb") as f:
        f.write(await file.read())

    # Parse resume
    parsed = parse_resume(temp_path)

    # Cleanup
    try:
        os.remove(temp_path)
    except:
        pass

    if "error" in parsed:
        raise HTTPException(status_code=400, detail="Resume parsing failed.")

    # Update candidate DB
    CandidateDB.update_parsed_resume(candidate_id, parsed)

    return {
        "ok": True,
        "message": "Resume uploaded successfully.",
        "parsed": parsed
    }


# -------------------------------------------------------------
# 2️⃣ RECRUITER — Upload Resume to THEIR profile (optional)
# -------------------------------------------------------------
@router.post("/recruiter/upload_resume")
async def recruiter_upload_resume(
    file: UploadFile = File(...),
    current_user=Depends(require_role("recruiter"))
):
    """
    Recruiter uploads their own resume (optional).
    Not used for matching or shortlisting. Stored in recruiter profile.
    """

    recruiter_id = current_user.get("linked_id")
    if not recruiter_id:
        raise HTTPException(status_code=400, detail="Recruiter profile not linked to user.")

    temp_path = f"/tmp/{current_user['_id']}_{file.filename}"
    with open(temp_path, "wb") as f:
        f.write(await file.read())

    parsed = parse_resume(temp_path)

    try:
        os.remove(temp_path)
    except:
        pass

    if "error" in parsed:
        raise HTTPException(status_code=400, detail="Resume parsing failed.")

    RecruiterDB.update_resume(recruiter_id, parsed)

    return {
        "ok": True,
        "message": "Recruiter resume uploaded.",
        "parsed": parsed
    }


# -------------------------------------------------------------
# 3️⃣ GENERIC TEMP UPLOAD (optional helper endpoint)
# -------------------------------------------------------------
@router.post("/temp")
async def upload_temp_file(file: UploadFile = File(...), current_user=Depends(get_current_user)):
    """
    Generic uploader — not stored in DB.
    Useful for recruiter chat where file > AI.
    """

    temp_path = f"/tmp/{current_user['_id']}_{file.filename}"
    with open(temp_path, "wb") as f:
        f.write(await file.read())

    return {
        "ok": True,
        "file_path": temp_path,
        "message": "File uploaded temporarily."
    }
