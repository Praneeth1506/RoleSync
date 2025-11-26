from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from typing import List, Optional
from ..auth.auth import require_role

from ..ai.self_analysis import run_self_analysis
from ..ai.batch_processing import process_batch
from ..ai.duplicate_detector import check_duplicate
from ..database.candidate import CandidateDB
from ..database.job_description import JobRoleDB
from ..ai.resume_parser import extract_text  

router = APIRouter(prefix="/api/ai", tags=["ai"])


from fastapi import APIRouter, UploadFile, File, Form
from typing import Optional, List

from ..ai.self_analysis import run_self_analysis
from ..ai.resume_parser import extract_text
from ..database.candidate import CandidateDB

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.post("/self_analysis")
async def api_self_analysis(
    jd_file: Optional[UploadFile] = File(None),           # optional JD file
    target_role: Optional[str] = Form(None),             # optional explicit role name
    current_user = Depends(require_role("candidate"))     # must be candidate
):
    """
    Candidate self-analysis:

    - Uses the candidate's stored resume from profile (CandidateDB, via user_id)
    - Optionally accepts a JD file (PDF/DOCX)
    - Optionally accepts a target_role (e.g. "Data Scientist")
    - If neither JD nor target_role is given → auto-detect role from resume
    """
    from ..ai.resume_parser import extract_text

    jd_text = None
    if jd_file:
        jd_path = f"/tmp/jd_{jd_file.filename}"
        with open(jd_path, "wb") as f:
            f.write(await jd_file.read())
        jd_text = extract_text(jd_path)

    res = run_self_analysis(
        user_id=current_user["_id"],
        jd_text=jd_text,
        target_role=target_role,
    )

    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])

    parsed = res.get("parsed", {}) or {}
    clean_parsed = {k: v for k, v in parsed.items() if k != "raw_text"}

    feedback = res.get("feedback", {}) or {}

    return {
        "ok": True,
        "candidate_id": current_user.get("linked_id"),
        "auto_detected_role": res.get("auto_detected_role"),
        "parsed": clean_parsed,
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



# -----------------------------
# OTHER ENDPOINTS (unchanged)
# -----------------------------
@router.post("/batch_process")
async def api_batch_process(
    files: List[UploadFile] = File(...),
    job_role_id: Optional[str] = Form(None),
    recruiter_id: Optional[str] = Form(None)
):
    paths = []
    for file in files:
        p = f"/tmp/{file.filename}"
        with open(p, "wb") as fh:
            fh.write(await file.read())
        paths.append(p)

    job_role = JobRoleDB.get(job_role_id) if job_role_id else None
    results = process_batch(paths, job_role=job_role, recruiter_id=recruiter_id)

    return {"ok": True, "results": results}


@router.post("/detect_duplicate")
async def api_detect_duplicate(file: UploadFile = File(...)):
    p = f"/tmp/{file.filename}"
    with open(p, "wb") as fh:
        fh.write(await file.read())

    def db_check_fn(hash_val, return_texts=False):
        if hash_val:
            return CandidateDB.find_by_hash(hash_val)
        if return_texts:
            return CandidateDB.find_texts()
        return None

    return check_duplicate(p, db_check_fn)


@router.post("/learning_path")
async def api_learning_path(
    skill_gaps: List[str] = Form(...),
    candidate_skills: List[str] = Form(...),
    target_role: Optional[str] = Form(None)
):
    from ..ai.learning_path import generate_learning_path
    res = generate_learning_path(skill_gaps, candidate_skills, target_role)
    return {"ok": True, "learning_path": res}
