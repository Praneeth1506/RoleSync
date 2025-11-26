# app/database/jobrole.py

from .connection import db
from bson.objectid import ObjectId
import datetime

jobroles_col = db.job_roles


# -----------------------------------------------------
# Helper: Clean duplicate parsed responsibilities
# -----------------------------------------------------
def _remove_duplicate_parsed_fields(job_doc: dict):
    """
    If top-level and parsed both contain responsibilities,
    remove parsed.responsibilities from API output.
    (We never modify DB, only sanitize response.)
    """
    if not job_doc:
        return job_doc

    parsed = job_doc.get("parsed")
    top_resp = job_doc.get("responsibilities")

    if parsed and top_resp and parsed.get("responsibilities"):
        # Remove duplicate to prevent duplication in API output
        parsed.pop("responsibilities", None)

    return job_doc


class JobRoleDB:

    # -----------------------------------------------------
    # Create a new Job Role
    # -----------------------------------------------------
    @staticmethod
    def create(doc: dict):
        doc.setdefault("created_at", datetime.datetime.utcnow())
        doc.setdefault("updated_at", datetime.datetime.utcnow())

        res = jobroles_col.insert_one(doc)
        doc["_id"] = str(res.inserted_id)
        return doc

    # -----------------------------------------------------
    # Get job role by ID
    # -----------------------------------------------------
    @staticmethod
    def get(job_role_id: str):
        try:
            doc = jobroles_col.find_one({"_id": ObjectId(job_role_id)})
            if not doc:
                return None

            doc["_id"] = str(doc["_id"])

            # 🔥 FIX DUPLICATE RESPONSIBILITIES
            doc = _remove_duplicate_parsed_fields(doc)

            return doc

        except:
            return None

    # -----------------------------------------------------
    # Find all job roles for a recruiter
    # -----------------------------------------------------
    @staticmethod
    def find_by_recruiter(recruiter_id: str):
        cur = jobroles_col.find({"recruiter_id": recruiter_id})
        roles = []

        for r in cur:
            r["_id"] = str(r["_id"])

            # 🔥 FIX DUPLICATE RESPONSIBILITIES
            r = _remove_duplicate_parsed_fields(r)

            roles.append(r)

        return roles

    # -----------------------------------------------------
    # Update job role
    # -----------------------------------------------------
    @staticmethod
    def update(job_role_id: str, updates: dict):
        updates["updated_at"] = datetime.datetime.utcnow()
        jobroles_col.update_one(
            {"_id": ObjectId(job_role_id)},
            {"$set": updates}
        )
        return JobRoleDB.get(job_role_id)

    @staticmethod
    def delete(job_role_id: str):
        jobroles_col.delete_one({"_id": ObjectId(job_role_id)})
        return True

    @staticmethod
    def get_matching_info(job_role_id: str):
        job = jobroles_col.find_one(
            {"_id": ObjectId(job_role_id)},
            {
                "required_skills": 1,
                "preferred_skills": 1,
                "experience_min": 1,
                "experience_max": 1,
                "keywords": 1,
                "parsed": 1,
                "responsibilities": 1
            }
        )
        if not job:
            return None

        job["_id"] = str(job["_id"])

        # 🔥 FIX DUPLICATE RESPONSIBILITIES
        job = _remove_duplicate_parsed_fields(job)

        return job

    @staticmethod
    def save_parsed(job_role_id: str, parsed: dict):
        parsed["updated_at"] = datetime.datetime.utcnow()
        jobroles_col.update_one(
            {"_id": ObjectId(job_role_id)},
            {"$set": {"parsed": parsed}}
        )
        return JobRoleDB.get(job_role_id)

    @staticmethod
    def add_candidate_analysis(job_role_id: str, candidate_id: str, match_score: float, ats_score: float):
        entry = {
            "candidate_id": candidate_id,
            "match_score": match_score,
            "ats_score": ats_score,
            "timestamp": datetime.datetime.utcnow()
        }

        jobroles_col.update_one(
            {"_id": ObjectId(job_role_id)},
            {"$push": {"candidate_analysis": entry}}
        )

    @staticmethod
    def ranked_candidates(job_role_id: str):
        job = jobroles_col.find_one({"_id": ObjectId(job_role_id)})
        if not job:
            return []

        analysis = job.get("candidate_analysis", [])
        sorted_list = sorted(
            analysis,
            key=lambda x: (x.get("match_score", 0), x.get("ats_score", 0)),
            reverse=True
        )

        return sorted_list
