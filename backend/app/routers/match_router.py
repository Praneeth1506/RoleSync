# app/routers/match_router.py
import os
import json
import datetime
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

# configure Gemini only if present (avoid crash)
_GENAI_KEY = os.getenv("GEMINI_API_KEY")
if _GENAI_KEY:
    try:
        genai.configure(api_key=_GENAI_KEY)
    except Exception:
        _GENAI_KEY = None


# ---------------- Helper: chat ensure ----------------
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


# ---------------- POST /match/score_single ----------------
@router.post("/score_single")
async def score_single(
    file: UploadFile = File(...),
    job_role_id: str = Form(...),
    current_user=Depends(require_role("recruiter"))
):
    """
    Upload one resume, compute match, ATS and semantic analysis.
    Saves candidate (if not present) and stores analysis.
    """
    job = JobRoleDB.get(job_role_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job role not found")

    # save temp and parse
    tmp = f"/tmp/{file.filename}"
    with open(tmp, "wb") as fh:
        fh.write(await file.read())
    parsed = parse_resume(tmp)
    try:
        os.remove(tmp)
    except Exception:
        pass

    if not parsed.get("email"):
        raise HTTPException(status_code=400, detail="Resume must include an email address")

    email = parsed["email"].lower()

    # find or create candidate doc
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

    # compute match using unified signature
    match_result = compute_match_score(parsed, job)
    match_score = match_result.get("score", 0)

    ats = compute_ats_score(parsed.get("parsed_text") or parsed.get("raw_text", ""), job.get("required_skills", []) or job.get("parsed", {}).get("required_skills", []))
    # semantic fit (LLM) separate
    try:
        semantic = explain_semantic_fit(parsed, job)
    except Exception:
        semantic = {"fit_summary": "semantic analysis failed", "strengths": [], "weaknesses": [], "reasoning_score": 0}

    analysis = {
        "job_role_id": job_role_id,
        "match_score": match_score,
        "match_components": match_result.get("components"),
        "match_method": match_result.get("method"),
        "ats_score": ats,
        "semantic": semantic,
        "skill_gaps": [
            s for s in (job.get("required_skills", []) or job.get("parsed", {}).get("required_skills", []))
            if s.lower() not in {sk.lower() for sk in (parsed.get("skills") or [])}
        ],
        "timestamp": datetime.datetime.utcnow()
    }

    CandidateDB.add_analysis(candidate_id, job_role_id, analysis)

    return {"ok": True, "candidate_id": candidate_id, "analysis": analysis}


# ---------------- POST /match/shortlist_batch ----------------
@router.post("/shortlist_batch")
async def shortlist_batch(
    files: List[UploadFile] = File(...),
    job_role_id: str = Form(...),
    current_user=Depends(require_role("recruiter"))
):
    """
    Upload multiple resumes for a job role.
    Auto-score, shortlist those above threshold, generate feedback for rejects,
    create invites for temp candidates, and add summary messages in recruiter chat.
    """
    job = JobRoleDB.get(job_role_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job role not found")

    shortlisted = []
    rejected = []
    invite_links = []

    # Ensure chat (activates context)
    chat = _get_or_create_shortlist_chat(current_user["_id"], job)
    chat_id = chat["_id"]

    for file in files:
        # save and parse
        tmp = f"/tmp/{file.filename}"
        with open(tmp, "wb") as fh:
            fh.write(await file.read())
        parsed = parse_resume(tmp)
        try:
            os.remove(tmp)
        except Exception:
            pass

        # if no email, mark rejected with reason (don't crash)
        if not parsed.get("email"):
            rejected.append({
                "candidate_id": None,
                "email": None,
                "name": parsed.get("name"),
                "match_score": 0,
                "ats_score": 0,
                "feedback": "Email not detected in resume. Unable to process candidate."
            })
            # add chat note
            RecruiterChatDB.add_message(
                chat_id=chat_id,
                sender=current_user["_id"],
                text=f"Could not process resume '{getattr(file, 'filename', 'unknown')}' — email not found.",
                message_type="text",
                metadata={"action": "reject", "reason": "no_email"}
            )
            continue

        email = parsed["email"].lower()

        # find/create candidate
        existing = CandidateDB.find_by_email(email)
        if existing:
            candidate_id = existing["_id"]
            # invite if temp profile
            if not existing.get("linked_user_id"):
                try:
                    invite = InviteDB.create_invite(candidate_temp_id=candidate_id, email=email, job_role_id=job_role_id)
                    invite_links.append({"email": email, "invite_url": f"https://rolesync.com/invite/{invite['token']}"})
                except Exception as e:
                    # log and continue
                    print("Invite creation failed:", e)
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
            try:
                invite = InviteDB.create_invite(candidate_temp_id=candidate_id, email=email, job_role_id=job_role_id)
                invite_links.append({"email": email, "invite_url": f"https://rolesync.com/invite/{invite['token']}"})
            except Exception as e:
                print("Invite creation failed for new candidate:", e)

        # compute match; unified signature expects candidate dict and job_role dict
        try:
            match_result = compute_match_score(parsed, job)
        except Exception as e:
            # fallback safe deterministic calculation if something unexpected happens
            print("compute_match_score unexpected error:", e)
            match_result = compute_match_score(parsed, job, use_llm=False)

        match_score = match_result.get("score", 0)
        ats = compute_ats_score(parsed.get("parsed_text") or parsed.get("raw_text", ""), job.get("required_skills", []) or job.get("parsed", {}).get("required_skills", []))

        # record submission event always
        CandidateDB.add_submission(candidate_id, job_role_id, current_user["_id"])

        # threshold for shortlist — tweakable
        SHORTLIST_THRESHOLD = 45

        if match_score >= SHORTLIST_THRESHOLD:
            # reason = explanations joined (more descriptive)
            reason = "; ".join(match_result.get("explanations", [])) or f"High match score ({match_score}%)"

            shortlisted.append({
                "candidate_id": candidate_id,
                "email": email,
                "name": parsed.get("name"),
                "match_score": match_score,
                "ats_score": ats,
                "reason": reason,
                "components": match_result.get("components")
            })

            CandidateDB.add_analysis(candidate_id, job_role_id, {
                "job_role_id": job_role_id,
                "match_score": match_score,
                "ats_score": ats,
                "method": match_result.get("method"),
                "components": match_result.get("components"),
                "timestamp": datetime.datetime.utcnow()
            })

            RecruiterChatDB.add_message(
                chat_id=chat_id,
                sender=current_user["_id"],
                text=f"Shortlisted {parsed.get('name')} ({email}) — Match: {match_score}%",
                message_type="text",
                metadata={"action": "shortlist", "candidate_id": candidate_id}
            )

        else:
            # generate short rejection feedback (use Gemini if key present)
            feedback = "We could not progress your application further for this role."
            if _GENAI_KEY:
                try:
                    model = genai.GenerativeModel("gemini-2.5-flash")
                    prompt = feedback_prompt = f"""
You are an expert hiring manager.

Write a concise rejection note for a candidate.
Include TWO parts:

1) A short, polite rejection message.
2) A personalized improvement section, based on skill gaps and job expectations.

Use this data:
- Job Title: {job.get('title')}
- Required Skills: {job.get('required_skills')}
- Candidate Skills: {parsed.get('skills')}
- Candidate Experience: {parsed.get('experience_years')}
- Preferred Skills: {job.get('preferred_skills')}
- Responsibilities: {job.get('responsibilities')}
- Skill Gaps: Identify missing required skills and mention them.

Output format (plain text, no JSON):
Thank you message...
Reason for rejection...

Areas to improve:
- improvement 1
- improvement 2
- improvement 3
"""

                    resp = model.generate_content(prompt)
                    feedback = resp.text.strip()
                except Exception:
                    pass

            rejected.append({
                "candidate_id": candidate_id,
                "email": email,
                "name": parsed.get("name"),
                "match_score": match_score,
                "ats_score": ats,
                "feedback": feedback
            })

            FeedbackDB.create_draft(
                candidate_id=candidate_id,
                recruiter_id=current_user["_id"],
                job_role_id=job_role_id,
                feedback_text=feedback
            )

            RecruiterChatDB.add_message(
                chat_id=chat_id,
                sender=current_user["_id"],
                text=f"Rejected {parsed.get('name')} ({email}) — {feedback}",
                message_type="text",
                metadata={"action": "reject", "candidate_id": candidate_id}
            )

    return {"ok": True, "chat_id": chat_id, "shortlisted": shortlisted, "rejected": rejected, "invite_links": invite_links}


# ---------------- POST /match/shortlist ----------------
@router.post("/shortlist")
def shortlist_candidate(
    candidate_id: str = Form(...),
    job_role_id: str = Form(...),
    action: Literal["shortlist", "reject"] = Form(...),
    manual_feedback: Optional[str] = Form(None),
    current_user = Depends(require_role("recruiter"))
):
    """
    Manually shortlist or reject an existing candidate for a job role.
    action is an enum dropdown ("shortlist" | "reject")
    """
    if action not in ("shortlist", "reject"):
        raise HTTPException(status_code=400, detail="Invalid action")

    candidate = CandidateDB.get(candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    job = JobRoleDB.get(job_role_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job role not found")

    CandidateDB.add_submission(candidate_id, job_role_id, current_user["_id"])
    chat = _get_or_create_shortlist_chat(current_user["_id"], job)
    chat_id = chat["_id"]

    candidate_name = candidate.get("name") or candidate.get("email")
    job_title = job.get("title", "Job Role")

    if action == "shortlist":
        # mark manual shortlist
        CandidateDB.add_manual_shortlist(candidate_id, job_role_id, current_user["_id"])

        RecruiterChatDB.add_message(
            chat_id=chat_id,
            sender=current_user["_id"],
            text=f"Shortlisted candidate {candidate_name} for '{job_title}'.",
            message_type="text",
            metadata={"action": "shortlist", "candidate_id": candidate_id, "job_role_id": job_role_id}
        )

        return {"ok": True, "message": "Candidate shortlisted.", "chat_id": chat_id}

    # action == "reject"
    if not manual_feedback:
        # try LLM feedback if available
        manual_feedback = "We did not progress your application further for this role."
        if _GENAI_KEY:
            try:
                model = genai.GenerativeModel("gemini-2.5-flash")
                prompt = f"Generate a short rejection message for candidate for job '{job.get('title')}'. Required skills: {job.get('required_skills')}. Candidate skills: {candidate.get('skills')}. Plain text only."
                resp = model.generate_content(prompt)
                manual_feedback = resp.text.strip()
            except Exception:
                pass

    CandidateDB.add_feedback(candidate_id, job_role_id, current_user["_id"], manual_feedback)

    RecruiterChatDB.add_message(
        chat_id=chat_id,
        sender=current_user["_id"],
        text=f"Rejected candidate {candidate_name} for '{job_title}'. Reason: {manual_feedback}",
        message_type="text",
        metadata={"action": "reject", "candidate_id": candidate_id, "job_role_id": job_role_id}
    )

    return {"ok": True, "message": "Candidate rejected.", "feedback": manual_feedback, "chat_id": chat_id}


# ---------------- GET /match/manual_shortlisted/{job_role_id} ----------------
@router.get("/manual_shortlisted/{job_role_id}")
def list_manually_shortlisted(
    job_role_id: str,
    current_user = Depends(require_role("recruiter"))
):
    recruiter_id = current_user["_id"]

    cursor = candidates_col.find({
        "manual_shortlists": {
            "$elemMatch": {
                "job_role_id": job_role_id,
                "recruiter_id": recruiter_id
            }
        }
    })

    results = []
    for c in cursor:
        cid = str(c.get("_id"))
        ts = None
        for m in c.get("manual_shortlists", []):
            if m.get("job_role_id") == job_role_id and m.get("recruiter_id") == recruiter_id:
                ts = m.get("timestamp")
                break

        results.append({
            "candidate_id": cid,
            "name": c.get("name"),
            "email": c.get("email"),
            "skills": c.get("skills", []),
            "experience_years": c.get("experience_years"),
            "timestamp": ts
        })

    return {"ok": True, "count": len(results), "manually_shortlisted": results}
