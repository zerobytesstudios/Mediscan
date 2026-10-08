"""Application configuration loaded from environment variables."""
import os
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()


def _bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


class Settings:
    APP_NAME = "Mediscan AI API"
    ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

    DATABASE_URL = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:password@localhost:5432/mediscan_ai",
    )

    SECRET_KEY = os.getenv("SECRET_KEY", "change_this_secret")
    ALGORITHM = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

    GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

    CORS_ORIGINS = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
        if origin.strip()
    ]

    UPLOAD_DIR = os.getenv(
        "UPLOAD_DIR",
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads"),
    )
    MAX_UPLOAD_SIZE_MB = int(os.getenv("MAX_UPLOAD_SIZE_MB", "10"))

    ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@mediscan.local")
    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "Admin@123")
    ADMIN_NAME = os.getenv("ADMIN_NAME", "Mediscan Administrator")

    ALLOW_DOCTOR_SELF_REGISTER = _bool(os.getenv("ALLOW_DOCTOR_SELF_REGISTER", "true"))


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
