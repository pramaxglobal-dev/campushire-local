from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import settings
from app.database import SessionLocal
from app.routers import health, matching, scoring


app = FastAPI(title="CampusHire AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, tags=["health"])
app.include_router(matching.router, prefix="/match", tags=["matching"])
app.include_router(scoring.router, prefix="/score", tags=["scoring"])


@app.on_event("startup")
async def startup() -> None:
    async with SessionLocal() as session:
        await session.execute(text("SELECT 1"))
