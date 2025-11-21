from datetime import datetime
from bson import ObjectId
from app.database.connection import db

class RecruiterChatDB:

    @staticmethod
    def create_chat(recruiter_id, job_role_id):
        doc = {
            "recruiter_id": recruiter_id,
            "job_role_id": job_role_id,
            "created_at": datetime.utcnow()
        }
        result = db.recruiter_chats.insert_one(doc)
        return str(result.inserted_id)

    @staticmethod
    def get_chat(chat_id):
        return db.recruiter_chats.find_one({"_id": ObjectId(chat_id)})
