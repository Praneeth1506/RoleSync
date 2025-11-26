# app/routers/jobrole_router.py

from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from typing import Optional, List
import os

from ..auth.auth import require_role, get_current_user
from ..ai.jd_parser import parse_jd
from ..database.jobrole import JobRoleDB
from ..database.recruiter import RecruiterDB

router = APIRouter(prefix="/jobrole", tags=["jobrole"])


# -----------------------------------------------------------
# CREATE JOB ROLE
# -----------------------------------------------------------
@router.post("/create")
async def create_jobrole(
    title: str = Form(...),                          # Job role name (e.g. "ML Engineer")
    jd_file: Optional[UploadFile] = File(None),      # Optional JD PDF/DOCX
    jd_text: Optional[str] = Form(None),             # Optional raw JD text
    location: Optional[str] = Form(None),            # Optional location
    current_user = Depends(require_role("recruiter"))
):
    """
    Create a Job Role.

    Recruiter inputs:
    - title (required): Name of the role
    - Either:
        - jd_file: PDF/DOCX with the JD
        - jd_text: Plain text JD

    Auto-filled:
    - recruiter_id: from current_user
    - company: from RecruiterDB (company_name)

    The JD is parsed using LLM into:
    - required_skills
    - preferred_skills
    - responsibilities
    - experience_level
    - seniority
    - tech_stack
    """

    if not jd_file and not jd_text:
        raise HTTPException(
            status_code=400,
            detail="You must provide either a JD file or JD text."
        )

    # Get recruiter profile for company name
    recruiter_profile = RecruiterDB.get_by_user_id(current_user["_id"])
    company_name = recruiter_profile.get("company_name") if recruiter_profile else None

    # Decide what to send to jd_parser: path or raw text
    jd_input: str

    if jd_file:
        # Save uploaded file to /tmp and pass its path to parser
        tmp_path = f"/tmp/{jd_file.filename}"
        with open(tmp_path, "wb") as f:
            f.write(await jd_file.read())
        jd_input = tmp_path
    else:
        # Use raw text directly
        jd_input = jd_text

    # Parse JD with LLM
    parsed = parse_jd(jd_input)

    # Build job role document
    job_doc = {
        "title": title,
        "company": company_name,
        "location": location,
        "recruiter_id": current_user["_id"],
        "required_skills": parsed.get("required_skills", []),
        "preferred_skills": parsed.get("preferred_skills", []),
        "responsibilities": parsed.get("responsibilities", []),
        "tech_stack": parsed.get("tech_stack", []),
        # you can normalize this to a numeric range later if you want
        "experience_min": parsed.get("experience_level"),
        "parsed": parsed,
    }

    job = JobRoleDB.create(job_doc)
    return {"ok": True, "job_role": job}


# -----------------------------------------------------------
# PARSE JD ONLY (no DB insert)
# -----------------------------------------------------------
@router.post("/parse")
async def parse_jd_endpoint(
    jd_file: Optional[UploadFile] = File(None),
    jd_text: Optional[str] = Form(None),
    current_user = Depends(require_role("recruiter"))
):
    """
    Just parse a JD (for preview) without saving a job role.

    Inputs:
    - jd_file: PDF/DOCX
    - OR jd_text: plain text

    Returns:
    - parsed JD structure
    """

    if not jd_file and not jd_text:
        raise HTTPException(
            status_code=400,
            detail="You must provide either a JD file or JD text."
        )

    if jd_file:
        tmp_path = f"/tmp/{jd_file.filename}"
        with open(tmp_path, "wb") as f:
            f.write(await jd_file.read())
        jd_input = tmp_path
    else:
        jd_input = jd_text

    parsed = parse_jd(jd_input)
    return {"ok": True, "parsed": parsed}


# -----------------------------------------------------------
# GET ONE JOB ROLE
# -----------------------------------------------------------
@router.get("/get/{job_role_id}")
def get_jobrole(job_role_id: str, current_user = Depends(get_current_user)):
    job = JobRoleDB.get(job_role_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job role not found")
    return {"ok": True, "job_role": job}


# -----------------------------------------------------------
# UPDATE JOB ROLE
# -----------------------------------------------------------
from pydantic import BaseModel

class JobRoleUpdate(BaseModel):
    title: Optional[str] = None
    location: Optional[str] = None
    required_skills: Optional[List[str]] = None
    preferred_skills: Optional[List[str]] = None
    responsibilities: Optional[List[str]] = None
    tech_stack: Optional[List[str]] = None
    experience_min: Optional[str] = None

@router.put("/update/{job_role_id}")
def update_jobrole(
    job_role_id: str,
    payload: JobRoleUpdate,
    current_user = Depends(require_role("recruiter")),
):
    job = JobRoleDB.get(job_role_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job role not found")

    # Optional: ensure this recruiter owns the job role
    if job.get("recruiter_id") != current_user["_id"]:
        raise HTTPException(status_code=403, detail="Not allowed to update this job role")

    update_data = {k: v for k, v in payload.dict().items() if v is not None}
    if update_data:
        JobRoleDB.update(job_role_id, update_data)

    updated = JobRoleDB.get(job_role_id)
    return {"ok": True, "job_role": updated}


# -----------------------------------------------------------
# LIST JOB ROLES FOR CURRENT RECRUITER
# -----------------------------------------------------------
@router.get("/list")
def list_jobroles(current_user = Depends(require_role("recruiter"))):
    jobs = JobRoleDB.find_by_recruiter(current_user["_id"])
    return {"ok": True, "job_roles": jobs}
