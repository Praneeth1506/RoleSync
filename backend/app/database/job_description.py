from .connection import db
from bson.objectid import ObjectId
import datetime

jobroles_col = db.job_roles

class JobRoleDB:
    @staticmethod
    def create(title: str, jd_text: str, created_by: str = None):
        doc = {
            "title": title,
            "jd_text": jd_text,
            "created_by": created_by,
            "created_at": datetime.datetime.utcnow()
        }
        res = jobroles_col.insert_one(doc)
        doc["_id"] = str(res.inserted_id)
        return doc

    @staticmethod
    def get(job_role_id: str):
        if not job_role_id:
            return None
        try:
            r = jobroles_col.find_one({"_id": ObjectId(job_role_id)})
            if not r:
                return None
            r["_id"] = str(r["_id"])
            return r
        except:
            return None

    @staticmethod
    def list_all(limit=100):
        cur = jobroles_col.find({}).limit(limit)
        out = []
        for r in cur:
            r["_id"] = str(r["_id"])
            out.append(r)
        return out
