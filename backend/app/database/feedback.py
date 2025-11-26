# app/database/feedback.py
from .connection import db
from bson.objectid import ObjectId
from datetime import datetime

feedback_col = db.feedback_drafts


class FeedbackDB:

    @staticmethod
    def create_draft(candidate_id, recruiter_id, job_role_id, feedback_text):
        draft = {
            "candidate_id": candidate_id,
            "recruiter_id": recruiter_id,
            "job_role_id": job_role_id,
            "text": feedback_text,
            "status": "pending",      # pending → approved
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }

        res = feedback_col.insert_one(draft)
        draft["_id"] = str(res.inserted_id)
        return draft

    @staticmethod
    def get(draft_id):
        try:
            d = feedback_col.find_one({"_id": ObjectId(draft_id)})
        except:
            return None
        if not d:
            return None
        d["_id"] = str(d["_id"])
        return d

    @staticmethod
    def list_pending(recruiter_id):
        cursor = feedback_col.find({
            "recruiter_id": recruiter_id,
            "status": "pending"
        }).sort("created_at", -1)

        drafts = []
        for d in cursor:
            d["_id"] = str(d["_id"])
            drafts.append(d)
        return drafts

    @staticmethod
    def update_draft(draft_id, new_text):
        feedback_col.update_one(
            {"_id": ObjectId(draft_id)},
            {"$set": {"text": new_text, "updated_at": datetime.utcnow()}}
        )
        return FeedbackDB.get(draft_id)

    @staticmethod
    def approve_draft(draft_id):
        feedback_col.update_one(
            {"_id": ObjectId(draft_id)},
            {"$set": {
                "status": "approved",
                "approved_at": datetime.utcnow()
            }}
        )
        return FeedbackDB.get(draft_id)
