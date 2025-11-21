from fastapi import APIRouter, UploadFile, File, Form
from typing import List, Optional

from ..ai.self_analysis import run_self_analysis
from ..ai.batch_processing import process_batch
from ..ai.duplicate_detector import check_duplicate
from ..database.candidate import CandidateDB
from ..database.job_description import JobRoleDB
from ..ai.resume_parser import extract_text   # <-- Needed for JD upload

router = APIRouter(prefix="/api/ai", tags=["ai"])

# -----------------------------------------------------------
# SELF ANALYSIS ENDPOINT
# -----------------------------------------------------------
@router.post("/self_analysis")
async def api_self_analysis(
    file: UploadFile = File(...),               
    jd_file: Optional[UploadFile] = File(None), 
    target_role: Optional[str] = Form(None)
):
    # ---- Save resume ----
    resume_path = f"/tmp/{file.filename}"
    with open(resume_path, "wb") as f:
        f.write(await file.read())

    # ---- Extract JD text safely ----
    jd_text = None
    if jd_file and jd_file.filename and jd_file.content_type != "application/octet-stream":
        jd_path = f"/tmp/jd_{jd_file.filename}"
        with open(jd_path, "wb") as f:
            f.write(await jd_file.read())
        jd_text = extract_text(jd_path)

    # ---- Run analysis ----
    res = run_self_analysis(
        file_path=resume_path,
        jd_text=jd_text,
        target_role=target_role
    )

    parsed = res.get("parsed", {})
    match_score = res.get("match_score")
    ats_score = res.get("ats_score")
    skill_gap = res.get("skill_gap", [])
    feedback = res.get("feedback", {})
    learning_path = res.get("learning_path", {})
    auto_role = res.get("auto_detected_role")

    candidate_doc = {
        "parsed": parsed,
        "analysis": {
            "match_score": match_score,
            "ats_score": ats_score,
            "skill_gap": skill_gap,
            "learning_path": learning_path
        },
        "auto_detected_role": auto_role,
        "feedback": feedback
    }

    saved = CandidateDB.insert_candidate_doc(candidate_doc)

    clean_parsed = {k: v for k, v in parsed.items() if k != "raw_text"}

    return {
        "ok": True,
        "candidate_id": saved.get("_id"),
        "auto_detected_role": auto_role,
        "parsed": clean_parsed,
        "ats_score": ats_score,
        "match_score": match_score,
        "skill_gap": skill_gap,
        "feedback": {
            "summary": feedback.get("summary"),
            "recommendations": feedback.get("recommendations")
        },
        "learning_path": learning_path,
        "timestamp": res.get("timestamp")
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


@router.post("/recruiter_query")
async def api_recruiter_query(
    query: str = Form(...),
    job_role_id: Optional[str] = Form(None)
):
    from ..ai.recruiter_assistant import answer_recruiter_query
    context = {"job_role_id": job_role_id} if job_role_id else {}
    res = answer_recruiter_query(query, recruiter_context=context)
    return {"ok": True, "answer": res}
