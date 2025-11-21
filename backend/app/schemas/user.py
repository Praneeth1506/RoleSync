from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    candidate = "candidate"
    recruiter = "recruiter"
    
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    role: UserRole 
    name: Optional[str] = None

class UserInDB(BaseModel):
    _id: str
    email: EmailStr
    hashed_password: str
    role: str
    linked_id: Optional[str] = None
    name: Optional[str] = None
    created_at: datetime

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    user_id: Optional[str] = None
    role: Optional[str] = None


