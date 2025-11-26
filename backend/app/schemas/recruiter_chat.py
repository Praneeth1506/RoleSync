from pydantic import BaseModel
from typing import List, Optional, Any

class Message(BaseModel):
    sender: str
    text: Optional[str] = None
    type: str = "text"
    metadata: Optional[dict] = {}
    timestamp: Optional[str] = None

class ChatCreate(BaseModel):
    creator_user_id: str
    title: Optional[str] = None
    job_role_id: Optional[str] = None
    candidates: Optional[List[dict]] = []

class ChatResponse(BaseModel):
    _id: str
    creator_user_id: str
    title: Optional[str]
    job_role_id: Optional[str]
    candidates: Optional[List[dict]]
    messages: List[Message]
    created_at: Optional[str]
    updated_at: Optional[str]
