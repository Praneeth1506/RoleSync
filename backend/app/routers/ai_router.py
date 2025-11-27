from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from typing import List, Optional
import os
from tempfile import NamedTemporaryFile

from ..auth.auth import require_role
from ..ai.self_analysis import run_self_analysis
from ..ai.batch_processing import process_batch
from ..ai.duplicate_detector import check_duplicate
from ..database.candidate import CandidateDB
from ..database.job_description import JobRoleDB
from ..ai.resume_parser import extract_text

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.post("/self_analysis")
async def api_self_analysis(
    jd_file: Optional[UploadFile] = File(None),
    target_role: Optional[str] = Form(None),
    current_user=Depends(require_role("candidate")),
):

    jd_text = None
    tmp_path = None

    if jd_file:
        with NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(await jd_file.read())
            tmp_path = tmp.name

        try:
            jd_text = extract_text(tmp_path)
        finally:
            try:
                os.remove(tmp_path)
            except:
                pass

    res = run_self_analysis(
        user_id=current_user["_id"],
        jd_text=jd_text,
        target_role=target_role,
    )

    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])

    parsed = res.get("parsed", {}) or {}
    parsed.pop("raw_text", None)
    feedback = res.get("feedback", {}) or {}

    return {
        "ok": True,
        "candidate_id": current_user.get("linked_id"),
        "auto_detected_role": res.get("auto_detected_role"),
        "parsed": parsed,
        "ats_score": res.get("ats_score"),
        "match_score": res.get("match_score"),
        "skill_gap": res.get("skill_gap", []),
        "feedback": {
            "summary": feedback.get("summary"),
            "recommendations": feedback.get("recommendations", []),
        },
        "learning_path": res.get("learning_path"),
        "timestamp": res.get("timestamp"),
    }


@router.post("/batch_process")
async def api_batch_process(
    files: List[UploadFile] = File(...),
    job_role_id: Optional[str] = Form(None),
    recruiter_id: Optional[str] = Form(None),
):
    paths = []

    try:
        for file in files:
            with NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                tmp.write(await file.read())
                paths.append(tmp.name)

        job_role = JobRoleDB.get(job_role_id) if job_role_id else None
        results = process_batch(paths, job_role=job_role, recruiter_id=recruiter_id)

        return {"ok": True, "results": results}

    finally:
        for p in paths:
            try:
                os.remove(p)
            except:
                pass

@router.post("/detect_duplicate")
async def api_detect_duplicate(file: UploadFile = File(...)):

    with NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(await file.read())
        path = tmp.name

    def db_check_fn(hash_val, return_texts=False):
        if hash_val:
            return CandidateDB.find_by_hash(hash_val)
        if return_texts:
            return CandidateDB.find_texts()
        return None

    try:
        return check_duplicate(path, db_check_fn)
    finally:
        try:
            os.remove(path)
        except:
            pass

@router.post("/learning_path")
async def api_learning_path(
    skill_gaps: List[str] = Form(...),
    candidate_skills: List[str] = Form(...),
    target_role: Optional[str] = Form(None),
):
    from ..ai.learning_path import generate_learning_path

    res = generate_learning_path(skill_gaps, candidate_skills, target_role)
    return {"ok": True, "learning_path": res}