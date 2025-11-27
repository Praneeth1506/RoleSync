from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from typing import Optional, List
from pydantic import BaseModel
import os
import tempfile

from ..auth.auth import require_role, get_current_user
from ..ai.jd_parser import parse_jd
from ..database.jobrole import JobRoleDB
from ..database.recruiter import RecruiterDB

router = APIRouter(prefix="/jobrole", tags=["jobrole"])


@router.post("/create")
async def create_jobrole(
    title: str = Form(...),
    jd_file: Optional[UploadFile] = File(None),
    jd_text: Optional[str] = Form(None),
    location: Optional[str] = Form(None),
    current_user = Depends(require_role("recruiter"))
):

    if not jd_file and not jd_text:
        raise HTTPException(
            status_code=400,
            detail="You must provide either a JD file or JD text."
        )

    recruiter_profile = RecruiterDB.get_by_user_id(current_user["_id"])
    company_name = recruiter_profile.get("company_name") if recruiter_profile else None

    jd_input: str

    if jd_file:
        suffix = os.path.splitext(jd_file.filename)[1]
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
        tmp_path = tmp.name
        tmp.write(await jd_file.read())
        tmp.close()
        jd_input = tmp_path
    else:
        jd_input = jd_text

    parsed = parse_jd(jd_input)

    if jd_file:
        try:
            os.remove(jd_input)
        except Exception:
            pass

    job_doc = {
        "title": title,
        "company": company_name,
        "location": location,
        "recruiter_id": current_user["_id"],
        "required_skills": parsed.get("required_skills", []),
        "preferred_skills": parsed.get("preferred_skills", []),
        "responsibilities": parsed.get("responsibilities", []),
        "tech_stack": parsed.get("tech_stack", []),
        "experience_min": parsed.get("experience_level"),
        "parsed": parsed,
    }

    job = JobRoleDB.create(job_doc)
    return {"ok": True, "job_role": job}


@router.post("/parse")
async def parse_jd_endpoint(
    jd_file: Optional[UploadFile] = File(None),
    jd_text: Optional[str] = Form(None),
    current_user = Depends(require_role("recruiter"))
):

    if not jd_file and not jd_text:
        raise HTTPException(
            status_code=400,
            detail="You must provide either a JD file or JD text."
        )

    if jd_file:
        suffix = os.path.splitext(jd_file.filename)[1]
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
        tmp_path = tmp.name
        tmp.write(await jd_file.read())
        tmp.close()
        jd_input = tmp_path
    else:
        jd_input = jd_text

    parsed = parse_jd(jd_input)

    if jd_file:
        try:
            os.remove(jd_input)
        except Exception:
            pass

    return {"ok": True, "parsed": parsed}


@router.get("/get/{job_role_id}")
def get_jobrole(job_role_id: str, current_user = Depends(get_current_user)):
    job = JobRoleDB.get(job_role_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job role not found")
    return {"ok": True, "job_role": job}


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

    if job.get("recruiter_id") != current_user["_id"]:
        raise HTTPException(status_code=403, detail="Not allowed to update this job role")

    update_data = {k: v for k, v in payload.dict().items() if v is not None}
    if update_data:
        JobRoleDB.update(job_role_id, update_data)

    updated = JobRoleDB.get(job_role_id)
    return {"ok": True, "job_role": updated}


@router.get("/list")
def list_jobroles(current_user = Depends(require_role("recruiter"))):
    jobs = JobRoleDB.find_by_recruiter(current_user["_id"])
    return {"ok": True, "job_roles": jobs}
