from fastapi import APIRouter, Depends, HTTPException, status, Cookie
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import JWTError, jwt
from pydantic import BaseModel
import os
import random
from bson.objectid import ObjectId
from dotenv import load_dotenv

from ..schemas.user import UserCreate, Token, TokenData,UserRole
from ..database.user import (
    create_user_doc,
    get_user_by_email,
    get_user_by_id,
    link_user_to_profile,
)
from ..database.candidate import CandidateDB
from ..database.connection import db

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY not set in .env")

ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

router = APIRouter(prefix="/auth", tags=["auth"])

def verify_password(plain, hashed):
    return pwd_context.verify(plain, hashed)

def get_password_hash(password):
    return pwd_context.hash(password)

def authenticate_user(email: str, password: str):
    user = get_user_by_email(email)
    if not user:
        return None
    if not verify_password(password, user.get("hashed_password")):
        return None
    return user

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(user_id: str):
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {"sub": user_id, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def generate_verification_code():
    return str(random.randint(100000, 999999))

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"}
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        role: str = payload.get("role")
        if user_id is None:
            raise credentials_exc
        token_data = TokenData(user_id=user_id, role=role)
    except JWTError:
        raise credentials_exc

    user = get_user_by_id(token_data.user_id)
    if user is None:
        raise credentials_exc

    return user


def require_role(role_name: str):
    async def role_checker(current_user = Depends(get_current_user)):
        if current_user.get("role") != role_name:
            raise HTTPException(status_code=403, detail="Forbidden")
        return current_user
    return role_checker

@router.post("/signup", status_code=201)
def signup(payload: UserCreate):
    existing = get_user_by_email(payload.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed = get_password_hash(payload.password)

    user_doc = create_user_doc(
        email=payload.email,
        hashed_password=hashed,
        role=payload.role.value,      
        name=payload.name,
        linked_id=None
    )

    verification_code = generate_verification_code()

    db.users.update_one(
        {"_id": ObjectId(user_doc["_id"])},
        {
            "$set": {
                "verification_code": verification_code,
                "is_verified": False
            }
        }
    )

    if payload.role == UserRole.candidate:
        candidate = CandidateDB.find_by_email(payload.email)
        if candidate:
            link_user_to_profile(user_doc["_id"], candidate["_id"])

    return {
        "ok": True,
        "message": "Signup successful. Please verify your email.",
        "user_id": user_doc["_id"],
        "email": user_doc["email"],
        "role": user_doc["role"],
        "verification_code": verification_code,   # Temporary (until email OTP sending is added)
        "linked_profile": user_doc.get("linked_id")
    }

@router.post("/verify")
def verify_account(email: str, code: str):
    user = get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.get("is_verified"):
        return {"verified": True}

    if user.get("verification_code") != code:
        raise HTTPException(status_code=400, detail="Incorrect verification code")

    db.users.update_one(
        {"_id": ObjectId(user["_id"])},
        {"$set": {"is_verified": True},
         "$unset": {"verification_code": ""}}
    )

    return {"verified": True}

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(form_data.username, form_data.password)

    if not user:
        raise HTTPException(status_code=401, detail="Incorrect username or password")

    if not user.get("is_verified"):
        raise HTTPException(status_code=403, detail="Email not verified")

    access_token = create_access_token({"sub": user["_id"], "role": user.get("role")})
    refresh_token = create_refresh_token(user["_id"])

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router.get("/me")
def me(current_user = Depends(get_current_user)):
    return {
        "user_id": current_user.get("_id"),
        "email": current_user.get("email"),
        "role": current_user.get("role"),
        "linked_id": current_user.get("linked_id"),
        "name": current_user.get("name")
    }

@router.post("/refresh")
def refresh(refresh_token: str):
    try:
        payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")

        user = get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid refresh token")

        new_access = create_access_token({"sub": user_id, "role": user.get("role")})
        return {"access_token": new_access, "token_type": "bearer"}

    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
