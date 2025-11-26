# app/database/recruiter_chat.py

from .connection import db
from bson.objectid import ObjectId
from datetime import datetime

# MAIN COLLECTION (use ONLY this)
chats_col = db.recruiter_chats


class RecruiterChatDB:

    # -----------------------------------------------------
    # Create Chat (general or contextual)
    # -----------------------------------------------------
    @staticmethod
    def create_chat(
        creator_user_id: str,
        chat_type: str = "general",   # "general" or "contextual"
        title: str = None,
        job_role_id: str = None,
        candidates=None,
        participants=None,
    ):
        if candidates is None:
            candidates = []
        if participants is None:
            participants = [creator_user_id]

        doc = {
            "chat_type": chat_type,
            "title": title or ("General Assistant" if chat_type == "general" else "Shortlisting Chat"),
            "creator_user_id": str(creator_user_id),
            "job_role_id": job_role_id,
            "candidates": candidates,
            "messages": [],
            "participants": [str(p) for p in participants],
            "archived": False,
            "last_ai_summary": None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }

        res = chats_col.insert_one(doc)
        doc["_id"] = str(res.inserted_id)
        return doc

    # -----------------------------------------------------
    # Get one chat
    # -----------------------------------------------------
    @staticmethod
    def get(chat_id: str):
        try:
            chat = chats_col.find_one({"_id": ObjectId(chat_id)})
        except:
            return None

        if not chat:
            return None

        chat["_id"] = str(chat["_id"])
        return chat

    # -----------------------------------------------------
    # Add message
    # -----------------------------------------------------
    @staticmethod
    def add_message(
        chat_id: str,
        sender: str,
        text: str,
        message_type: str = "text",
        metadata: dict = None,
        sender_role: str = None,
    ):
        if metadata is None:
            metadata = {}

        msg = {
            "message_id": str(ObjectId()),
            "sender": str(sender),
            "sender_role": sender_role,
            "type": message_type,      # text/file/ai
            "text": text,
            "metadata": metadata,
            "timestamp": datetime.utcnow(),
        }

        chats_col.update_one(
            {"_id": ObjectId(chat_id)},
            {
                "$push": {"messages": msg},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )

        return msg

    # -----------------------------------------------------
    # List chats for a recruiter
    # -----------------------------------------------------
    @staticmethod
    def list_for_user(user_id: str):
        uid = str(user_id)

        cursor = chats_col.find(
            {"$or": [{"creator_user_id": uid}, {"participants": uid}]}
        ).sort("updated_at", -1)

        chats = []
        for c in cursor:
            c["_id"] = str(c["_id"])
            chats.append(c)
        return chats

    # -----------------------------------------------------
    # General/Homepage Chat (ONLY 1 per recruiter)
    # -----------------------------------------------------
    @staticmethod
    def get_or_create_global_chat(recruiter_id: str):

        chat = chats_col.find_one({
            "creator_user_id": str(recruiter_id),
            "chat_type": "general"
        })

        if chat:
            chat["_id"] = str(chat["_id"])
            return chat

        # create one general assistant chat
        doc = {
            "chat_type": "general",
            "title": "General Assistant",
            "creator_user_id": str(recruiter_id),
            "job_role_id": None,
            "messages": [],
            "participants": [str(recruiter_id)],
            "archived": False,
            "last_ai_summary": None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }

        res = chats_col.insert_one(doc)
        doc["_id"] = str(res.inserted_id)
        return doc

    # -----------------------------------------------------
    # Contextual Chat Summary Helper
    # -----------------------------------------------------
    @staticmethod
    def format_chat_history(chat_id: str):
        chat = chats_col.find_one({"_id": ObjectId(chat_id)})
        if not chat:
            return ""

        history = ""
        for m in chat.get("messages", []):
            sender = "Recruiter" if m.get("sender_role") != "ai" else "Assistant"
            history += f"{sender}: {m.get('text')}\n"

        return history

