"""Mediscan AI FastAPI application entry point."""
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import init_db
from app.routers import (
    admin,
    ai,
    appointments,
    auth,
    consultations,
    conversations,
    dashboard,
    doctors,
    documents,
    hospitals,
    medical_records,
    notifications,
    patients,
)
from app.ws import register_websocket


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "AI-assisted healthcare platform MVP. Users can register, manage profiles, "
        "upload medical documents, obtain cautious AI explanations powered by Groq, "
        "search doctors, book appointments and manage medical history."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(_: Request, exc: Exception):
    """Never leak Python stack traces to API clients."""
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected server error occurred."},
    )


@app.get("/api/health", tags=["Health"], summary="Service health check")
def health():
    return {"status": "ok", "service": settings.APP_NAME}


ROUTERS = (
    auth.router,
    patients.router,
    doctors.router,
    hospitals.router,
    documents.router,
    ai.router,
    appointments.router,
    medical_records.router,
    consultations.router,
    conversations.router,
    notifications.router,
    dashboard.router,
    admin.router,
)

for api_router in ROUTERS:
    app.include_router(api_router)

register_websocket(app)
