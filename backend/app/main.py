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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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

