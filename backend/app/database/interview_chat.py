from ..database.connection import db
from bson.objectid import ObjectId
from datetime import datetime

interview_col = db.interview_chats

class InterviewChatDB:

    @staticmethod
    def create_session(candidate_id, target_role=None):
        doc = {
            "candidate_id": candidate_id,
            "target_role": target_role,
            "messages": [],
            "created_at": datetime.utcnow()
        }
        res = interview_col.insert_one(doc)
        doc["_id"] = str(res.inserted_id)
        return doc

    @staticmethod
    def get(session_id):
        chat = interview_col.find_one({"_id": ObjectId(session_id)})
        if chat:
            chat["_id"] = str(chat["_id"])
        return chat

    @staticmethod
    def add_message(session_id, sender, text, metadata=None):
        msg = {
            "sender": sender,  # "candidate" or "ai"
            "text": text,
            "metadata": metadata or {},
            "timestamp": datetime.utcnow()
        }
        interview_col.update_one(
            {"_id": ObjectId(session_id)},
            {"$push": {"messages": msg}}
        )

    @staticmethod
    def list_for_candidate(candidate_id):
        chats = list(interview_col.find({"candidate_id": candidate_id}))
        for c in chats:
            c["_id"] = str(c["_id"])
        return chats
