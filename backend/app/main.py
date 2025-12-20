from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from .routers import (
    ai_router,
    upload_router,
    jobrole_router,
    match_router,
    recruiter_chat_router,
    invite_router,
    profile_router,
    interview_router,
    feedback_router,
    recruiter_router,
    candidate_router,
    feedback_router,
)
from .auth import auth

app = FastAPI()


origins = [
    # The two crucial addresses your browser uses:
    "http://localhost:5173",   
    "http://127.0.0.1:5173",   
    
    # Internal addresses:
    "http://127.0.0.1:8000",
    "http://localhost:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(ai_router.router)
app.include_router(upload_router.router)
app.include_router(jobrole_router.router)
app.include_router(match_router.router)
app.include_router(recruiter_chat_router.router)
app.include_router(invite_router.router)
app.include_router(profile_router.router)
app.include_router(interview_router.router)
app.include_router(recruiter_router.router)
app.include_router(candidate_router.router)
app.include_router(feedback_router.router)




if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

