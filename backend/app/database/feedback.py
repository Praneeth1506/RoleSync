from bson import ObjectId
from datetime import datetime
from .connection import db

feedback_col = db.feedback_drafts


class FeedbackDB:

    @staticmethod
    def _oid(val):
        return val if isinstance(val, ObjectId) else ObjectId(val)

    @staticmethod
    def create_draft(candidate_id, recruiter_id, job_role_id, feedback_text):

        cid = FeedbackDB._oid(candidate_id)
        rid = FeedbackDB._oid(recruiter_id)
        jid = FeedbackDB._oid(job_role_id)

        existing = feedback_col.find_one({
            "candidate_id": cid,
            "recruiter_id": rid,
            "job_role_id": jid,
            "status": "pending"
        })

        if existing:
            existing["_id"] = str(existing["_id"])
            return existing

        draft = {
            "candidate_id": cid,
            "recruiter_id": rid,
            "job_role_id": jid,
            "text": feedback_text,
            "status": "pending",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }

        res = feedback_col.insert_one(draft)
        draft["_id"] = str(res.inserted_id)
        return draft

    @staticmethod
    def get(draft_id):
        d = feedback_col.find_one({"_id": ObjectId(draft_id)})
        if not d:
            return None
        d["_id"] = str(d["_id"])
        d["recruiter_id"] = str(d["recruiter_id"])
        return d

    @staticmethod
    def list_pending(recruiter_id):
        rid = FeedbackDB._oid(recruiter_id)

        cursor = feedback_col.find({
            "recruiter_id": rid,
            "status": "pending"
        }).sort("created_at", -1)

        drafts = []
        for d in cursor:
            d["_id"] = str(d["_id"])
            d["recruiter_id"] = str(d["recruiter_id"])
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

    @staticmethod
    def list_for_candidate(candidate_id):
        cid = ObjectId(candidate_id) if not isinstance(candidate_id, ObjectId) else candidate_id

        cursor = feedback_col.find({
            "candidate_id": cid,
            "status": "approved"
        }).sort("approved_at", -1)

        feedbacks = []
        for f in cursor:
            f["_id"] = str(f["_id"])
            f["candidate_id"] = str(f["candidate_id"])
            f["recruiter_id"] = str(f["recruiter_id"])
            f["job_role_id"] = str(f["job_role_id"])
            feedbacks.append(f)

        return feedbacks

    @staticmethod
    def reject_remaining_for_job(recruiter_id, job_role_id):
        rid = ObjectId(recruiter_id) if not isinstance(recruiter_id, ObjectId) else recruiter_id
        jid = ObjectId(job_role_id) if not isinstance(job_role_id, ObjectId) else job_role_id

        default_rejection = (
            "Thank you for your interest. "
            "After careful consideration, we have decided not to proceed further at this time."
        )

        result = feedback_col.update_many(
            {
                "recruiter_id": rid,
                "job_role_id": jid,
                "status": "pending"
            },
            {
                "$set": {
                    "status": "approved",
                    "approved_at": datetime.utcnow(),
                    "text": default_rejection
                }
            }
        )

        return result.modified_count