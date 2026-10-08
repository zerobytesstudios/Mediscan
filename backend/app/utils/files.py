"""Upload validation and safe file-name generation."""
import os
import re
import uuid

from fastapi import HTTPException, UploadFile

from app.config import settings

ALLOWED_EXTENSIONS = {".pdf", ".txt", ".jpg", ".jpeg", ".png"}
ALLOWED_MIME_PREFIXES = ("application/pdf", "image/", "text/plain")
MAX_SIZE_BYTES = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024


def _safe_document_type(value: str | None) -> str:
    if not value:
        return "other"
    cleaned = re.sub(r"[^a-zA-Z0-9 _-]", "", value).strip()
    return cleaned[:80] or "other"


def validate_upload(file: UploadFile) -> str:
    """Validate extension, mime type and size. Returns the normalised extension."""
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    content_type = (file.content_type or "").lower()
    if content_type and not any(
        content_type.startswith(prefix) for prefix in ALLOWED_MIME_PREFIXES
    ):
        raise HTTPException(status_code=400, detail=f"Unsupported content type: {content_type}")

    size = 0
    # Size is enforced while streaming to disk in the document service.
    return ext


def save_upload(file: UploadFile, ext: str) -> tuple[str, str, int]:
    """Stream the upload to the uploads folder with a generated safe name.

    Returns (stored_filename, absolute_path, file_size).
    """
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    stored_name = f"{uuid.uuid4().hex}{ext}"
    destination = os.path.join(settings.UPLOAD_DIR, stored_name)

    size = 0
    try:
        with open(destination, "wb") as out:
            while True:
                chunk = file.file.read(1024 * 1024)
                if not chunk:
                    break
                size += len(chunk)
                if size > MAX_SIZE_BYTES:
                    raise HTTPException(
                        status_code=413,
                        detail=f"File exceeds the {settings.MAX_UPLOAD_SIZE_MB} MB limit.",
                    )
                out.write(chunk)
    except HTTPException:
        if os.path.exists(destination):
            os.remove(destination)
        raise
    except Exception:
        if os.path.exists(destination):
            os.remove(destination)
        raise HTTPException(status_code=500, detail="Could not save the uploaded file.")

    if size == 0:
        os.remove(destination)
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    return stored_name, destination, size


def remove_file(file_path: str) -> None:
    try:
        if file_path and os.path.exists(file_path):
            os.remove(file_path)
    except OSError:
        pass
