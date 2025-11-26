from .connection import db
from bson.objectid import ObjectId
import datetime

candidates_col = db.candidates


class CandidateDB:

    # ---------------------------------------------------------
    # 1. Insert candidate document
    # ---------------------------------------------------------
    @staticmethod
    def insert_candidate_doc(doc: dict):
        now = datetime.datetime.utcnow()
        doc.setdefault("created_at", now)
        doc.setdefault("updated_at", now)
        res = candidates_col.insert_one(doc)
        doc["_id"] = str(res.inserted_id)
        return doc

    # ---------------------------------------------------------
    # 2. Update parsed resume (used in profile resume upload)
    # ---------------------------------------------------------
    @staticmethod
    def update_parsed_resume(candidate_id, parsed_data: dict):
        candidates_col.update_one(
            {"_id": ObjectId(candidate_id)},
            {"$set": {
                "name": parsed_data.get("name"),
                "email": parsed_data.get("email", "").lower(),
                "skills": parsed_data.get("skills", []),
                "projects": parsed_data.get("projects", []),
                "education": parsed_data.get("education", []),
                "experience_years": parsed_data.get("experience_years", 0),
                "parsed_text": parsed_data.get("raw_text", ""),
                "updated_at": datetime.datetime.utcnow()
            }}
        )
        return CandidateDB.get(candidate_id)

    # ---------------------------------------------------------
    # 3. Find by resume hash (duplicate detection)
    # ---------------------------------------------------------
    @staticmethod
    def find_by_hash(h: str):
        r = candidates_col.find_one({"file_hash": h})
        if not r:
            return None
        r["_id"] = str(r["_id"])
        return r

    # ---------------------------------------------------------
    # 4. Find by email (auto-linking)
    # ---------------------------------------------------------
    @staticmethod
    def find_by_email(email: str):
        r = candidates_col.find_one({"email": email.lower()})
        if not r:
            return None
        r["_id"] = str(r["_id"])
        return r

    # ---------------------------------------------------------
    # 5. Find by linked user_id (candidate logged-in account)
    # ---------------------------------------------------------
    @staticmethod
    def find_by_user_id(user_id: str):
        r = candidates_col.find_one({"user_id": user_id})
        if not r:
            return None
        r["_id"] = str(r["_id"])
        return r

    # ---------------------------------------------------------
    # 6. Update resume (used internally)
    # ---------------------------------------------------------
    @staticmethod
    def update_resume(candidate_id: str, parsed_data: dict):
        candidates_col.update_one(
            {"_id": ObjectId(candidate_id)},
            {"$set": {
                "name": parsed_data.get("name"),
                "email": parsed_data.get("email", "").lower(),
                "skills": parsed_data.get("skills", []),
                "projects": parsed_data.get("projects", []),
                "education": parsed_data.get("education", []),
                "experience_years": parsed_data.get("experience_years", 0),
                "parsed_text": parsed_data.get("raw_text", ""),
                "updated_at": datetime.datetime.utcnow()
            }}
        )
        return CandidateDB.get(candidate_id)

    # ---------------------------------------------------------
    # 7. Store analysis for a specific JD (ATS, match score)
    # ---------------------------------------------------------
    @staticmethod
    def add_analysis(candidate_id: str, job_role_id: str, analysis_dict: dict):
        analysis_dict.setdefault("timestamp", datetime.datetime.utcnow())

        candidates_col.update_one(
            {"_id": ObjectId(candidate_id)},
            {
                "$push": {"analysis": analysis_dict},
                "$set": {"updated_at": datetime.datetime.utcnow()}
            }
        )
        return True

    # ---------------------------------------------------------
    # 8. Get top N candidates (ranking)
    # ---------------------------------------------------------
    @staticmethod
    def get_top_n(job_role_id: str, n: int = 5):
        cursor = candidates_col.find(
            {"analysis.job_role_id": job_role_id},
            {"analysis": 1}
        )

        ranking = []
        for r in cursor:
            analyses = r.get("analysis", [])
            entry = next(
                (a for a in analyses if a.get("job_role_id") == job_role_id),
                None
            )
            if entry:
                ranking.append({
                    "candidate_id": str(r["_id"]),
                    "match_score": entry.get("match_score", 0),
                    "ats_score": entry.get("ats_score", 0),
                })

        ranked = sorted(
            ranking,
            key=lambda x: (x["match_score"], x["ats_score"]),
            reverse=True
        )
        return ranked[:n]

    # ---------------------------------------------------------
    # 9. Store recruiter feedback
    # ---------------------------------------------------------
    @staticmethod
    def add_feedback(candidate_id: str, job_role_id: str, recruiter_id: str, feedback_text: str):
        fb = {
            "job_role_id": job_role_id,
            "recruiter_id": recruiter_id,
            "feedback": feedback_text,
            "timestamp": datetime.datetime.utcnow()
        }
        return candidates_col.update_one(
            {"_id": ObjectId(candidate_id)},
            {"$push": {"feedback_history": fb}}
        )

    # ---------------------------------------------------------
    # 10. Store resume submission history
    # ---------------------------------------------------------
    @staticmethod
    def add_submission(candidate_id: str, job_role_id: str, recruiter_id: str):
        record = {
            "job_role_id": job_role_id,
            "recruiter_id": recruiter_id,
            "timestamp": datetime.datetime.utcnow()
        }
        candidates_col.update_one(
            {"_id": ObjectId(candidate_id)},
            {"$push": {"submission_history": record}}
        )

    # ---------------------------------------------------------
    # 11. General getter
    # ---------------------------------------------------------
    @staticmethod
    def get(candidate_id: str):
        try:
            r = candidates_col.find_one({"_id": ObjectId(candidate_id)})
            if not r:
                return None
            r["_id"] = str(r["_id"])
            return r
        except Exception:
            return None

    # ---------------------------------------------------------
    # 12. Text samples (optional)
    # ---------------------------------------------------------
    @staticmethod
    def find_texts(limit: int = 200):
        cur = candidates_col.find({}, {"_id": 1, "parsed_text": 1}).limit(limit)
        return [{"_id": str(r["_id"]), "text": r.get("parsed_text", "")} for r in cur]

    # ---------------------------------------------------------
    # 13. Link temp candidate profile to final user after invite signup
    # ---------------------------------------------------------
    @staticmethod
    def link_resume_to_user(candidate_temp_id: str, user_id: str):
        candidates_col.update_one(
            {"_id": ObjectId(candidate_temp_id)},
            {"$set": {"linked_user_id": user_id}}
        )

    
    @staticmethod
    def add_manual_shortlist(candidate_id: str, job_role_id: str, recruiter_id: str):
        record = {
            "job_role_id": job_role_id,
            "recruiter_id": recruiter_id,
            "timestamp": datetime.datetime.utcnow()
        }
        candidates_col.update_one(
            {"_id": ObjectId(candidate_id)},
            {"$push": {"manual_shortlists": record}}
        )

        @staticmethod
        def add_final_feedback(candidate_id, job_role_id, feedback_text):
            entry = {
                "job_role_id": job_role_id,
                "feedback": feedback_text,
                "timestamp": datetime.datetime.utcnow()
            }

            candidates_col.update_one(
                {"_id": ObjectId(candidate_id)},
                {"$push": {"final_feedback": entry}}
            )

