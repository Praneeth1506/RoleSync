import os
import json
import datetime
import tempfile
from typing import List, Optional, Literal

from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException

import google.generativeai as genai

from ..auth.auth import require_role
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


def generate_shortlist_explanation(parsed, job, match_score):
    if not _GENAI_KEY:
        return {
            "summary": f"Candidate matched {match_score}% of job requirements.",
            "strengths": [],
            "recommendation": "Good profile for this role."
        }

    prompt = f"""
You are a senior technical recruiter.

Explain why this candidate was shortlisted.

Job Title: {job.get('title')}
Required Skills: {job.get('required_skills')}
Preferred Skills: {job.get('preferred_skills')}
Candidate Skills: {parsed.get('skills')}
Candidate Experience (years): {parsed.get('experience_years')}
Match Score: {match_score}%

Return STRICT JSON:
{{
  "summary": "2–4 line explanation",
  "strengths": ["skill1", "skill2"],
  "recommendation": "Explain why the candidate is a good fit"
}}
"""

    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        resp = model.generate_content(prompt)
        return json.loads(resp.text)
    except Exception:
        return {
            "summary": f"Candidate matched {match_score}% of job requirements.",
            "strengths": [],
            "recommendation": "Suitable for this role."
        }


def generate_rejection_feedback(parsed, job, match_score):
    if not _GENAI_KEY:
        return "Your profile does not currently meet the role requirements."

    prompt = f"""
You are a hiring manager.

Write a polite rejection feedback with improvement guidance.

Job Title: {job.get('title')}
Required Skills: {job.get('required_skills')}
Preferred Skills: {job.get('preferred_skills')}
Candidate Skills: {parsed.get('skills')}
Candidate Experience: {parsed.get('experience_years')} years
Match Score: {match_score}%

Format:
- Short rejection sentence
- Areas to Improve (bullet points)
Plain text only.
"""

    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        resp = model.generate_content(prompt)
        return resp.text.strip()
    except Exception:
        return "We are unable to proceed at this stage. Please improve alignment with job requirements."


@router.post("/score_single")
async def score_single(
    file: UploadFile = File(...),
    job_role_id: str = Form(...),
    current_user=Depends(require_role("recruiter"))
):
    job = JobRoleDB.get(job_role_id)
    if not job:
        raise HTTPException(404, "Job role not found")

    suffix = os.path.splitext(file.filename)[1]
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    tmp.write(await file.read())
    tmp.close()

    parsed = parse_resume(tmp.name)

    try:
        os.remove(tmp.name)
    except:
        pass

    if not parsed.get("email"):
        raise HTTPException(400, "Resume must contain an email")

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
            "parsed_text": parsed.get("raw_text", ""),
            "experience_years": parsed.get("experience_years", 0),
            "analysis": [],
            "linked_user_id": None
        })
        candidate_id = created["_id"]

    match_result = compute_match_score(parsed, job)
    match_score = match_result.get("score", 0)

    ats = compute_ats_score(
        parsed.get("parsed_text", ""),
        job.get("required_skills", [])
    )

    semantic = explain_semantic_fit(parsed, job)

    analysis = {
        "job_role_id": job_role_id,
        "match_score": match_score,
        "ats_score": ats,
        "semantic": semantic,
        "timestamp": datetime.datetime.utcnow()
    }

    CandidateDB.add_analysis(candidate_id, job_role_id, analysis)

    return {"ok": True, "candidate_id": candidate_id, "analysis": analysis}


@router.post("/shortlist_batch")
async def shortlist_batch(
    files: List[UploadFile] = File(...),
    job_role_id: str = Form(...),
    current_user=Depends(require_role("recruiter"))
):
    job = JobRoleDB.get(job_role_id)
    if not job:
        raise HTTPException(404, "Job role not found")

    shortlisted, rejected, invite_links = [], [], []

    chat = _get_or_create_shortlist_chat(current_user["_id"], job)
    chat_id = chat["_id"]

    for file in files:
        suffix = os.path.splitext(file.filename)[1]
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
        tmp.write(await file.read())
        tmp.close()

        parsed = parse_resume(tmp.name)
        os.remove(tmp.name)

        if not parsed.get("email"):
            continue

        email = parsed["email"].lower()
        existing = CandidateDB.find_by_email(email)
        candidate_id = existing["_id"] if existing else CandidateDB.insert_candidate_doc({
            "email": email,
            "name": parsed.get("name"),
            "skills": parsed.get("skills", []),
            "parsed_text": parsed.get("raw_text", ""),
            "analysis": [],
            "linked_user_id": None
        })["_id"]

        match_result = compute_match_score(parsed, job)
        match_score = match_result.get("score", 0)
        ats = compute_ats_score(parsed.get("parsed_text", ""), job.get("required_skills", []))

        if match_score >= 45:
            explanation = generate_shortlist_explanation(parsed, job, match_score)
            shortlisted.append({
                "candidate_id": candidate_id,
                "email": email,
                "name": parsed.get("name"),
                "match_score": match_score,
                "ats_score": ats,
                "explanation": explanation
            })
        else:
            feedback = generate_rejection_feedback(parsed, job, match_score)
            FeedbackDB.create_draft(candidate_id, current_user["_id"], job_role_id, feedback)
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