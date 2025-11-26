from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import JWTError, jwt
import os
import random
from bson.objectid import ObjectId
from dotenv import load_dotenv
from typing import Optional

from ..schemas.user import (
    UserCreateCandidate,
    UserCreateRecruiter,
    Token,
    TokenData,
)
from ..database.user import (
    create_user_doc,
    get_user_by_email,
    get_user_by_id,
    link_user_to_profile,
)
from ..database.candidate import CandidateDB
from ..database.recruiter import RecruiterDB
from ..database.invite import InviteDB
from ..database.feedback import FeedbackDB
from ..database.connection import db

load_dotenv()

router = APIRouter(prefix="/auth", tags=["auth"])

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")

ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# ---------------------------------------------------
# PASSWORD UTILITIES
# ---------------------------------------------------
def hash_password(password: str):
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str):
    return pwd_context.verify(plain, hashed)


# ---------------------------------------------------
# TOKEN UTILITIES
# ---------------------------------------------------
def create_access_token(data: dict, expires_delta: timedelta = None):
    payload = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    payload.update({"exp": expire})
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(user_id: str):
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {"sub": user_id, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


# ---------------------------------------------------
# AUTH DEPENDENCIES
# ---------------------------------------------------
async def get_current_user(token: str = Depends(oauth2_scheme)):
    cred_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid authentication credentials",
        headers={"WWW-Authenticate": "Bearer"}
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        role = payload.get("role")
        if not user_id:
            raise cred_exc
    except JWTError:
        raise cred_exc

    user = get_user_by_id(user_id)
    if not user:
        raise cred_exc

    return user


def require_role(role: str):
    async def wrapper(current_user=Depends(get_current_user)):
        if current_user.get("role") != role:
            raise HTTPException(status_code=403, detail="Forbidden")
        return current_user
    return wrapper


# ---------------------------------------------------
# SIGNUP — CANDIDATE
# ---------------------------------------------------
@router.post("/signup/candidate", status_code=201)
def signup_candidate(payload: UserCreateCandidate):
    existing = get_user_by_email(payload.email)
    if existing:
        raise HTTPException(400, "Email already registered")

    hashed = hash_password(payload.password)

    user = create_user_doc(
        email=payload.email,
        hashed_password=hashed,
        role="candidate",
        name=payload.name,
        linked_id=None
    )

    # -------- CREATE CANDIDATE PROFILE --------
    profile = CandidateDB.insert_candidate_doc({
        "user_id": user["_id"],
        "email": payload.email.lower(),
        "name": payload.name,
        "linkedin": payload.linkedin,
        "phone": payload.phone,
        "created_at": datetime.utcnow()
    })

    link_user_to_profile(user["_id"], profile["_id"])

    # Verification code
    code = str(random.randint(100000, 999999))
    db.users.update_one(
        {"_id": ObjectId(user["_id"])},
        {"$set": {"verification_code": code, "is_verified": False}}
    )

    return {"ok": True, "message": "Candidate signup successful.", "verification_code": code}


# ---------------------------------------------------
# SIGNUP — RECRUITER
# ---------------------------------------------------
@router.post("/signup/recruiter", status_code=201)
def signup_recruiter(payload: UserCreateRecruiter):
    existing = get_user_by_email(payload.email)
    if existing:
        raise HTTPException(400, "Email already registered")

    hashed = hash_password(payload.password)

    user = create_user_doc(
        email=payload.email,
        hashed_password=hashed,
        role="recruiter",
        name=payload.name,
        linked_id=None
    )

    # -------- CREATE RECRUITER PROFILE --------
    rec = RecruiterDB.create_recruiter_profile(
        user_id=user["_id"],
        company_name=payload.company_name,
        linkedin=payload.linkedin,
    )
    link_user_to_profile(user["_id"], rec["_id"])

    # Verification code
    code = str(random.randint(100000, 999999))
    db.users.update_one(
        {"_id": ObjectId(user["_id"])},
        {"$set": {"verification_code": code, "is_verified": False}}
    )

    return {"ok": True, "message": "Recruiter signup successful.", "verification_code": code}


# ---------------------------------------------------
# VERIFY EMAIL
# ---------------------------------------------------
@router.post("/verify")
def verify_account(email: str, code: str):
    user = get_user_by_email(email)
    if not user:
        raise HTTPException(404, "User not found")

    if user.get("verification_code") != code:
        raise HTTPException(400, "Invalid verification code")

    db.users.update_one(
        {"_id": ObjectId(user["_id"])},
        {"$set": {"is_verified": True}, "$unset": {"verification_code": ""}}
    )

    return {"verified": True}


# ---------------------------------------------------
# LOGIN (COMMON)
# ---------------------------------------------------
@router.post("/login", response_model=Token)
def login(form: OAuth2PasswordRequestForm = Depends()):
    user = get_user_by_email(form.username)
    if not user:
        raise HTTPException(401, "Incorrect email or password")

    if not verify_password(form.password, user["hashed_password"]):
        raise HTTPException(401, "Incorrect email or password")

    if not user.get("is_verified"):
        raise HTTPException(403, "Email not verified")

    access = create_access_token({"sub": user["_id"], "role": user["role"]})
    refresh = create_refresh_token(user["_id"])

    return {
        "access_token": access,
        "refresh_token": refresh,
        "token_type": "bearer",
    }


# ---------------------------------------------------
# ME
# ---------------------------------------------------
@router.get("/me")
def me(current_user=Depends(get_current_user)):
    return current_user
