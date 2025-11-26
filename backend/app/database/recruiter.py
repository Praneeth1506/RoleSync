# app/database/recruiter.py

from .connection import db
from bson.objectid import ObjectId
import datetime

recruiter_col = db.recruiters
users_col = db.users


class RecruiterDB:
    # ---------------------------------------------------------
    # 1. Create recruiter profile on signup
    # ---------------------------------------------------------
    @staticmethod
    def create_recruiter_profile(user_id: str, company_name: str, linkedin: str = None, phone: str = None):
        doc = {
            "user_id": user_id,
            "company_name": company_name,
            "linkedin": linkedin,
            "phone": phone,
            "resume": {},               # recruiter resume (optional)
            "created_at": datetime.datetime.utcnow(),
            "updated_at": datetime.datetime.utcnow()
        }
        res = recruiter_col.insert_one(doc)
        doc["_id"] = str(res.inserted_id)
        return doc

    # ---------------------------------------------------------
    # 2. Get recruiter profile by user id
    # ---------------------------------------------------------
    @staticmethod
    def get_by_user_id(user_id: str):
        r = recruiter_col.find_one({"user_id": user_id})
        if not r:
            return None
        r["_id"] = str(r["_id"])
        return r

    # ---------------------------------------------------------
    # 3. Update recruiter profile fields
    # ---------------------------------------------------------
    @staticmethod
    def update_profile(user_id: str, data: dict):
        data["updated_at"] = datetime.datetime.utcnow()
        recruiter_col.update_one({"user_id": user_id}, {"$set": data})
        return RecruiterDB.get_by_user_id(user_id)

    # ---------------------------------------------------------
    # 4. Upload or update recruiter resume (parsed output)
    # ---------------------------------------------------------
    @staticmethod
    def update_resume(recruiter_id: str, parsed_data: dict):
        """
        Stores parsed recruiter resume fields inside recruiter profile.
        parsed_data is output of parse_resume().
        """

        recruiter_col.update_one(
            {"_id": ObjectId(recruiter_id)},
            {
                "$set": {
                    "resume": {
                        "name": parsed_data.get("name"),
                        "email": parsed_data.get("email"),
                        "skills": parsed_data.get("skills", []),
                        "projects": parsed_data.get("projects", []),
                        "experience_years": parsed_data.get("experience_years", 0),
                        "parsed_text": parsed_data.get("raw_text", "")
                    },
                    "updated_at": datetime.datetime.utcnow()
                }
            }
        )
        return RecruiterDB.get(recruiter_id)

    # ---------------------------------------------------------
    # 5. Generic getter using recruiter_id
    # ---------------------------------------------------------
    @staticmethod
    def get(recruiter_id: str):
        r = recruiter_col.find_one({"_id": ObjectId(recruiter_id)})
        if not r:
            return None
        r["_id"] = str(r["_id"])
        return r
    

    @staticmethod
    def get(recruiter_id: str):
        try:
            oid = ObjectId(recruiter_id)
            r = users_col.find_one({"_id": oid})
            if r:
                r["_id"] = str(r["_id"])
                return r
        except:
            pass

        r = users_col.find_one({"_id": recruiter_id})
        if r:
            r["_id"] = str(r["_id"])
            return r

        return None

