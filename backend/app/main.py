from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers.ai_router import router as ai_router
from app.auth.auth import router as auth_router
from app.routers.jobrole_router import router as jobrole_router
from app.routers.match_router import router as match_router
from app.routers.upload_router import router as upload_router
from app.routers.invite_router import router as invite_router
from app.routers.recruiter_chat_router import router as recruiter_chat_router
from app.routers.dummy_router import router as dummy_router

import uvicorn

app = FastAPI(title="RoleSync AI Backend")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(ai_router)
app.include_router(jobrole_router)
app.include_router(match_router)
app.include_router(upload_router)
app.include_router(invite_router)
app.include_router(recruiter_chat_router)
app.include_router(dummy_router)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)



