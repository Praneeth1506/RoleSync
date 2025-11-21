from datetime import datetime
from bson import ObjectId
from app.database.connection import db

class RecruiterMessageDB:

    @staticmethod
    def add_message(chat_id, sender, text):
        doc = {
            "chat_id": chat_id,
            "sender": sender,  # "recruiter" or "ai"
            "text": text,
            "timestamp": datetime.utcnow()
        }
        db.recruiter_messages.insert_one(doc)

    @staticmethod
    def get_messages(chat_id, limit=20):
        return list(
            db.recruiter_messages
              .find({"chat_id": chat_id})
              .sort("timestamp", -1)
              .limit(limit)
        )[::-1]  # reverse to chronological order

    @staticmethod
    def get_full_chat(chat_id):
        return list(
            db.recruiter_messages
              .find({"chat_id": chat_id})
              .sort("timestamp", 1)
        )
