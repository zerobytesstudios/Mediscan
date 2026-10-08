"""Groq powered report analysis and healthcare education chatbot."""
import base64
import mimetypes
import os
import tempfile

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai import groq_service
from app.config import settings
from app.database import get_db
from app.dependencies.auth import get_current_user, require_patient
from app.models import MedicalDocument, Patient, User
from app.schemas.document import ChatAttachment, ChatIn, ChatOut, DocumentDetailOut
from app.services.audit import audit
from app.services.text_extractor import extract_text
from app.utils.serialize import serialize_document

router = APIRouter(prefix="/api/ai", tags=["AI"])

CHAT_EXTENSIONS = {"jpg", "jpeg", "png", "pdf", "txt"}


@router.post(
    "/analyze-document/{document_id}",
    response_model=DocumentDetailOut,
    summary="Explain an uploaded medical report with Groq",
)
def analyze_document(
    document_id: int,
    user: User = Depends(require_patient),
    db: Session = Depends(get_db),
):
    document = db.get(MedicalDocument, document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")

    patient = db.execute(select(Patient).where(Patient.user_id == user.id)).scalar_one_or_none()
    if patient is None or document.patient_id != patient.id:
        raise HTTPException(status_code=403, detail="You can only analyse your own documents")

    if not document.extracted_text:
        raise HTTPException(
            status_code=422,
            detail=(
                "No readable text was found in this file, so it cannot be analysed. "
                "Upload a text-based PDF or TXT report. Image OCR requires optional "
                "pytesseract/Pillow configuration."
            ),
        )

    try:
        summary = groq_service.analyze_report(document.extracted_text, document.filename)
    except groq_service.AIServiceError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    document.ai_summary = summary
    audit(db, user.id, "ai_analyze_document", "medical_documents", document.id)
    db.commit()
    db.refresh(document)
    return serialize_document(document, include_text=True)


def _read_attachment(attachment: ChatAttachment) -> tuple[str, bytes]:
    """Validate and decode a chat attachment. Returns (extension, raw bytes)."""
    name = (attachment.filename or "").strip()
    ext = name.rsplit(".", 1)[-1].lower() if "." in name else ""
    if ext not in CHAT_EXTENSIONS:
        raise HTTPException(
            status_code=400, detail="Chat attachments must be JPG, PNG, PDF or TXT files."
        )

    try:
        raw = base64.b64decode(attachment.data_base64 or "", validate=False)
    except Exception:
        raise HTTPException(status_code=400, detail="The attachment could not be read.")
    if not raw:
        raise HTTPException(status_code=400, detail="The attachment is empty.")

    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(raw) > max_bytes:
        raise HTTPException(
            status_code=400, detail=f"Attachment is too large (max {settings.MAX_UPLOAD_SIZE_MB} MB)."
        )
    return ext, raw


def _image_attachment(attachment: ChatAttachment) -> dict:
    mime = (attachment.content_type or "").strip() or mimetypes.guess_type(attachment.filename or "")[0]
    if not mime or not mime.startswith("image/"):
        mime = "image/png"
    return {
        "kind": "image",
        "filename": attachment.filename or "image",
        "content_type": mime,
        "data_base64": attachment.data_base64,
    }


def _text_attachment(attachment: ChatAttachment, raw: bytes, ext: str) -> dict:
    fd, path = tempfile.mkstemp(suffix=f".{ext}")
    os.close(fd)
    try:
        with open(path, "wb") as handle:
            handle.write(raw)
        text, _status = extract_text(path, f".{ext}")
    finally:
        os.remove(path)

    text = (text or "").strip()
    if not text:
        raise HTTPException(
            status_code=422,
            detail="No readable text could be extracted from that file. For images, use JPG or PNG.",
        )
    return {"kind": "text", "filename": attachment.filename or "document", "text": text[:20000]}


@router.post("/chat", response_model=ChatOut, summary="Ask the healthcare education assistant")
def chat(payload: ChatIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    message = payload.message.strip()
    attachment = None

    if payload.attachment is not None:
        ext, raw = _read_attachment(payload.attachment)
        if ext in {"jpg", "jpeg", "png"}:
            attachment = _image_attachment(payload.attachment)
        else:
            attachment = _text_attachment(payload.attachment, raw, ext)

    if not message and attachment is None:
        raise HTTPException(status_code=400, detail="Please enter a question.")
    if not message:
        message = "Please analyse the attached file."

    conversation = ""
    for item in payload.history[-6:]:
        if item.role in {"user", "assistant"} and item.content:
            conversation += f"{item.role}: {item.content[:600]}\n"

    prompt = f"Conversation so far:\n{conversation}\nuser: {message}" if conversation else message

    try:
        reply = groq_service.health_chat(prompt, attachment=attachment)
    except groq_service.AIServiceError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    audit(db, user.id, "ai_chat", "ai", None)
    db.commit()
    return {"reply": reply}
