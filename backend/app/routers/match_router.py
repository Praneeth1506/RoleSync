import os
import json
import datetime
import tempfile
from typing import List, Optional, Literal

from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException

import google.generativeai as genai

from ..auth.auth import require_role, get_current_user
from ..database.candidate import CandidateDB, candidates_col
from ..database.jobrole import JobRoleDB
from ..database.invite import InviteDB
from ..database.recruiter_chat import RecruiterChatDB
from ..database.feedback import FeedbackDB

from ..ai.resume_parser import parse_resume
from ..ai.match_score import compute_match_score
from ..ai.ats_scoring import compute_ats_score
from ..ai.semantic_fit import explain_semantic_fit

router = APIRouter(prefix="/match", tags=["match"])

_GENAI_KEY = os.getenv("GEMINI_API_KEY")
if _GENAI_KEY:
    try:
        genai.configure(api_key=_GENAI_KEY)
    except Exception:
        _GENAI_KEY = None


def _get_or_create_shortlist_chat(recruiter_id: str, job_role: dict):
    job_role_id = job_role.get("_id")
    job_title = job_role.get("title", "Job Role")

    chats = RecruiterChatDB.list_for_user(recruiter_id) or []
    for c in chats:
        if c.get("job_role_id") == job_role_id:
            return c

    chat = RecruiterChatDB.create_chat(
        creator_user_id=recruiter_id,
        title=f"Shortlisting – {job_title}",
        job_role_id=job_role_id,
        candidates=[],
    )
    return chat


@router.post("/score_single")
async def score_single(
    file: UploadFile = File(...),
    job_role_id: str = Form(...),
    current_user=Depends(require_role("recruiter"))
):
    job = JobRoleDB.get(job_role_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job role not found")

    suffix = os.path.splitext(file.filename)[1]
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    tmp_path = tmp.name
    tmp.write(await file.read())
    tmp.close()

    parsed = parse_resume(tmp_path)

    try:
        os.remove(tmp_path)
    except Exception:
        pass

    if not parsed.get("email"):
        raise HTTPException(status_code=400, detail="Resume must include an email address")

    email = parsed["email"].lower()

    existing = CandidateDB.find_by_email(email)
    if existing:
        candidate_id = existing["_id"]
    else:
        created = CandidateDB.insert_candidate_doc({
            "email": email,
            "name": parsed.get("name"),
            "skills": parsed.get("skills", []),
            "projects": parsed.get("projects", []),
            "parsed_text": parsed.get("raw_text", "") or parsed.get("parsed_text", ""),
            "experience_years": parsed.get("experience_years", 0),
            "analysis": [],
            "linked_user_id": None
        })
        candidate_id = created["_id"]

    match_result = compute_match_score(parsed, job)
    match_score = match_result.get("score", 0)

    ats = compute_ats_score(
        parsed.get("parsed_text") or parsed.get("raw_text", ""),
        job.get("required_skills", []) or job.get("parsed", {}).get("required_skills", [])
    )

    try:
        semantic = explain_semantic_fit(parsed, job)
    except Exception:
        semantic = {
            "fit_summary": "semantic analysis failed",
            "strengths": [],
            "weaknesses": [],
            "reasoning_score": 0
        }

    analysis = {
        "job_role_id": job_role_id,
        "match_score": match_score,
        "match_components": match_result.get("components"),
        "match_method": match_result.get("method"),
        "ats_score": ats,
        "semantic": semantic,
        "skill_gaps": [
            s for s in (
                job.get("required_skills") or
                job.get("parsed", {}).get("required_skills", [])
            )
            if s.lower() not in {sk.lower() for sk in (parsed.get("skills") or [])}
        ],
        "timestamp": datetime.datetime.utcnow()
    }

    CandidateDB.add_analysis(candidate_id, job_role_id, analysis)

    return {
        "ok": True,
        "candidate_id": candidate_id,
        "analysis": analysis
    }


@router.post("/shortlist_batch")
async def shortlist_batch(
    files: List[UploadFile] = File(...),
    job_role_id: str = Form(...),
    current_user=Depends(require_role("recruiter"))
):
    job = JobRoleDB.get(job_role_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job role not found")

    shortlisted = []
    rejected = []
    invite_links = []

    chat = _get_or_create_shortlist_chat(current_user["_id"], job)
    chat_id = chat["_id"]

    for file in files:
        suffix = os.path.splitext(file.filename)[1]
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
        tmp_path = tmp.name
        tmp.write(await file.read())
        tmp.close()

        parsed = parse_resume(tmp_path)

        try:
            os.remove(tmp_path)
        except Exception:
            pass

        if not parsed.get("email"):
            rejected.append({
                "candidate_id": None,
                "email": None,
                "name": parsed.get("name"),
                "match_score": 0,
                "ats_score": 0,
                "feedback": "Email not detected in resume. Unable to process candidate."
            })
            continue

        email = parsed["email"].lower()

        existing = CandidateDB.find_by_email(email)
        if existing:
            candidate_id = existing["_id"]
        else:
            new_cand = CandidateDB.insert_candidate_doc({
                "email": email,
                "name": parsed.get("name"),
                "skills": parsed.get("skills", []),
                "projects": parsed.get("projects", []),
                "parsed_text": parsed.get("raw_text", "") or parsed.get("parsed_text", ""),
                "experience_years": parsed.get("experience_years", 0),
                "analysis": [],
                "linked_user_id": None
            })
            candidate_id = new_cand["_id"]

        match_result = compute_match_score(parsed, job)
        match_score = match_result.get("score", 0)

        ats = compute_ats_score(
            parsed.get("parsed_text") or parsed.get("raw_text", ""),
            job.get("required_skills", []) or job.get("parsed", {}).get("required_skills", [])
        )

        CandidateDB.add_submission(candidate_id, job_role_id, current_user["_id"])

        if match_score >= 45:
            shortlisted.append({
                "candidate_id": candidate_id,
                "email": email,
                "name": parsed.get("name"),
                "match_score": match_score,
                "ats_score": ats
            })
        else:
            feedback = "We could not progress your application further for this role."
            FeedbackDB.create_draft(
                candidate_id=candidate_id,
                recruiter_id=current_user["_id"],
                job_role_id=job_role_id,
                feedback_text=feedback
            )
            rejected.append({
                "candidate_id": candidate_id,
                "email": email,
                "name": parsed.get("name"),
                "match_score": match_score,
                "ats_score": ats,
                "feedback": feedback
            })

    return {
        "ok": True,
        "chat_id": chat_id,
        "shortlisted": shortlisted,
        "rejected": rejected,
        "invite_links": invite_links
    }
