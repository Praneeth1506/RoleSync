from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class UserCreateCandidate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str
    linkedin: Optional[str] = None
    phone: Optional[str] = None


class UserCreateRecruiter(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str
    company_name: str
    linkedin: Optional[str] = None
    phone: Optional[str] = None


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str


class TokenData(BaseModel):
    user_id: Optional[str] = None
    role: Optional[str] = None
