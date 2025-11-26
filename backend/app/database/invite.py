# app/database/invite.py
from .connection import db
from bson.objectid import ObjectId
import datetime
import secrets

invite_col = db.invites


class InviteDB:

    @staticmethod
    def create_invite(candidate_temp_id: str, email: str, job_role_id: str):
        token = secrets.token_urlsafe(32)
        now = datetime.datetime.utcnow()

        invite_doc = {
            "token": token,
            "candidate_temp_id": candidate_temp_id,
            "email": email.lower(),
            "job_role_id": job_role_id,
            "status": "pending",
            "used": False,
            "created_at": now
        }

        res = invite_col.insert_one(invite_doc)
        invite_doc["_id"] = str(res.inserted_id)
        return invite_doc

    @staticmethod
    def get_by_token(token: str):
        r = invite_col.find_one({"token": token, "used": False})
        if not r:
            return None
        r["_id"] = str(r["_id"])
        return r

    @staticmethod
    def mark_used(token: str, user_id: str):
        invite_col.update_one(
            {"token": token},
            {"$set": {"used": True, "used_by": user_id}}
        )