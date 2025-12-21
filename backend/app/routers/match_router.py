import os
import json
import datetime
import tempfile
from typing import List

from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from openai import OpenAI

from ..auth.auth import require_role
from ..database.candidate import CandidateDB
from ..database.jobrole import JobRoleDB
from ..database.invite import InviteDB
from ..database.recruiter_chat import RecruiterChatDB
from ..database.feedback import FeedbackDB

from ..ai.resume_parser import parse_resume
from ..ai.match_score import compute_match_score
from ..ai.ats_scoring import compute_ats_score
from ..ai.semantic_fit import explain_semantic_fit

router = APIRouter(prefix="/match", tags=["match"])
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

MATCH_THRESHOLD = 45


def _get_or_create_shortlist_chat(recruiter_id: str, job_role: dict):
    for c in RecruiterChatDB.list_for_user(recruiter_id) or []:
        if c.get("job_role_id") == job_role["_id"]:
            return c

    return RecruiterChatDB.create_chat(
        creator_user_id=recruiter_id,
        title=f"Shortlisting – {job_role.get('title', 'Job Role')}",
        job_role_id=job_role["_id"],
        candidates=[]
    )


def _openai_json(prompt: str) -> dict:
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.4
    )
    text = resp.choices[0].message.content.strip()
    s, e = text.find("{"), text.rfind("}")
    return json.loads(text[s:e + 1])


def generate_shortlist_explanation(parsed, job, match_score):
    prompt = f"""
Explain why this candidate was shortlisted.

Job Title: {job.get('title')}
Required Skills: {job.get('required_skills')}
Preferred Skills: {job.get('preferred_skills')}
Candidate Skills: {parsed.get('skills')}
Experience: {parsed.get('experience_years')} years
Match Score: {match_score}%

Return STRICT JSON:
{{
  "summary": "",
  "strengths": [],
  "recommendation": ""
}}
"""
    try:
        return _openai_json(prompt)
    except Exception:
        return {
            "summary": f"Matched {match_score}% of requirements.",
            "strengths": [],
            "recommendation": "Proceed to interview"
        }


def generate_rejection_feedback(parsed, job, match_score):
    prompt = f"""
Write polite rejection feedback with improvement advice.

Candidate Name: {parsed.get("name")}
Company Name: {job.get("company_name", "Our Company")}
Job Title: {job.get('title')}
Required Skills: {job.get('required_skills')}
Candidate Skills: {parsed.get('skills')}
Match Score: {match_score}%

Plain text only.
"""
    try:
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5
        )
        return resp.choices[0].message.content.strip()
    except Exception:
        return "Your profile does not currently meet the role requirements."



@router.post("/single")
def match_single_candidate(
    candidate_id: str = Form(...),
    job_role_id: str = Form(...),
    current_user=Depends(require_role("recruiter"))
):
    job = JobRoleDB.get(job_role_id)
    if not job:
        raise HTTPException(404, "Job role not found")

    candidate = CandidateDB.get(candidate_id)
    if not candidate:
        raise HTTPException(404, "Candidate not found")

    parsed = {
        "skills": candidate.get("skills", []),
        "parsed_text": candidate.get("parsed_text", ""),
        "experience_years": candidate.get("experience_years", 0),
        "name": candidate.get("name"),
        "email": candidate.get("email"),
    }

    match = compute_match_score(parsed, job)
    score = match["score"]
    ats = compute_ats_score(
        parsed.get("parsed_text", ""),
        job.get("required_skills", [])
    )

    chat = _get_or_create_shortlist_chat(current_user["_id"], job)

    if score >= MATCH_THRESHOLD:
        FeedbackDB.create_draft(
            candidate_id=candidate["_id"],
            recruiter_id=current_user["_id"],
            job_role_id=job_role_id,
            feedback_text=""
        )

        return {
            "ok": True,
            "status": "shortlisted",
            "candidate_id": str(candidate["_id"]),
            "match_score": score,
            "ats_score": ats,
            "explanation": generate_shortlist_explanation(parsed, job, score),
            "chat_id": str(chat["_id"])
        }

    feedback = generate_rejection_feedback(parsed, job, score)
    FeedbackDB.create_draft(
        candidate_id=candidate["_id"],
        recruiter_id=current_user["_id"],
        job_role_id=job_role_id,
        feedback_text=feedback
    )

    return {
        "ok": True,
        "status": "rejected",
        "candidate_id": candidate["_id"],
        "match_score": score,
        "ats_score": ats,
        "feedback": feedback
    }


@router.post("/shortlist_batch")
async def shortlist_batch(
    files: List[UploadFile] = File(...),
    job_role_id: str = Form(...),
    current_user=Depends(require_role("recruiter"))
):
    job = JobRoleDB.get(job_role_id)
    if not job:
        raise HTTPException(404, "Job role not found")

    shortlisted, rejected = [], []
    chat = _get_or_create_shortlist_chat(current_user["_id"], job)

    for file in files:
        suffix = os.path.splitext(file.filename)[1]
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
        tmp.write(await file.read())
        tmp.close()

        parsed = parse_resume(tmp.name)
        os.remove(tmp.name)

        if not parsed.get("email"):
            continue

        email = parsed["email"].strip().lower()

        candidate = CandidateDB.find_or_create_by_email(
            email,
            {
                "email": email,
                "name": parsed.get("name"),
                "skills": parsed.get("skills", []),
                "parsed_text": parsed.get("raw_text", ""),
                "analysis": []
            }
        )

        match = compute_match_score(parsed, job)
        score = match["score"]
        ats = compute_ats_score(
            parsed.get("parsed_text", ""),
            job.get("required_skills", [])
        )

        analysis = {
            "candidate_id": candidate["_id"],
            "job_role_id": job_role_id,
            "name": parsed.get("name"),
            "email": email,
            "match_score": score,
            "ats_score": ats,
            "skills": parsed.get("skills", []),
            "experience_years": parsed.get("experience_years", 0),
            "timestamp": datetime.datetime.utcnow()
        }

        CandidateDB.add_analysis(candidate["_id"], job_role_id, analysis)

        if score >= MATCH_THRESHOLD:
            FeedbackDB.create_draft(
                candidate_id=candidate["_id"],
                recruiter_id=current_user["_id"],
                job_role_id=job_role_id,
                feedback_text=""
            )

            shortlisted.append({
                "candidate_id": str(candidate["_id"]),
                "email": email,
                "name": parsed.get("name"),
                "match_score": score,
                "ats_score": ats,
                "explanation": generate_shortlist_explanation(parsed, job, score)
            })
        else:
            feedback = generate_rejection_feedback(parsed, job, score)
            draft = FeedbackDB.create_draft(
                candidate_id=candidate["_id"],
                recruiter_id=current_user["_id"],
                job_role_id=job_role_id,
                feedback_text=feedback
            )

            rejected.append({
                "candidate_id": str(candidate["_id"]),
                "email": email,
                "name": parsed.get("name"),
                "match_score": score,
                "ats_score": ats,
                "draft_id": str(draft["_id"]),
                "feedback": feedback
            })

    return {
        "ok": True,
        "chat_id": str(chat["_id"]),
        "shortlisted": shortlisted,
        "rejected": rejected,
        "invite_links": []
    }
