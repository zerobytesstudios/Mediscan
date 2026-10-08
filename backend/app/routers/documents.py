"""Medical document upload, listing, viewing, download and deletion."""
import os

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user, require_admin, require_patient
from app.models import Appointment, Doctor, MedicalDocument, Patient, User, UserRole
from app.services.audit import audit
from app.services.text_extractor import extract_text
from app.utils.files import remove_file, save_upload, validate_upload
from app.utils.serialize import serialize_document

router = APIRouter(prefix="/api/documents", tags=["Documents"])


def _patient_for_user(db: Session, user: User) -> Patient:
    patient = db.execute(select(Patient).where(Patient.user_id == user.id)).scalar_one_or_none()
    if patient is None:
        raise HTTPException(status_code=400, detail="Complete your patient profile first.")
    return patient


def _can_access(db: Session, user: User, document: MedicalDocument) -> bool:
    if user.role == UserRole.ADMIN:
        return True
    if user.role == UserRole.PATIENT:
        return document.patient_id == _safe_patient_id(db, user)
    if user.role == UserRole.DOCTOR:
        doctor = db.execute(select(Doctor).where(Doctor.user_id == user.id)).scalar_one_or_none()
        if doctor is None:
            return False
        linked = (
            db.execute(
                select(Appointment.id)
                .where(
                    Appointment.doctor_id == doctor.id,
                    Appointment.patient_id == document.patient_id,
                )
                .limit(1)
            ).first()
        )
        return linked is not None
    return False


def _safe_patient_id(db: Session, user: User) -> int | None:
    patient = db.execute(select(Patient).where(Patient.user_id == user.id)).scalar_one_or_none()
    return patient.id if patient else None


def _load_document(db: Session, document_id: int) -> MedicalDocument:
    document = db.get(MedicalDocument, document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return document


@router.post(
    "/upload",
    status_code=status.HTTP_201_CREATED,
    summary="Upload a medical document (PDF, TXT, JPG, PNG)",
)
def upload_document(
    file: UploadFile = File(...),
    document_type: str = Form("other"),
    user: User = Depends(require_patient),
    db: Session = Depends(get_db),
):
    ext = validate_upload(file)
    patient = _patient_for_user(db, user)

    stored_name, path, size = save_upload(file, ext)
    extracted_text, extraction_status = extract_text(path, ext)

    document = MedicalDocument(
        patient_id=patient.id,
        filename=os.path.basename(file.filename or stored_name),
        file_path=path,
        file_type=ext.lstrip(".").upper(),
        file_size=size,
        document_type=document_type[:80] if document_type else "other",
        extracted_text=extracted_text or None,
        extraction_status=extraction_status,
    )
    db.add(document)
    audit(db, user.id, "upload_document", "medical_documents", document.id)
    db.commit()
    db.refresh(document)
    return serialize_document(document, include_text=True)


@router.get("", summary="List documents visible to the current user")
def list_documents(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role == UserRole.ADMIN:
        documents = db.execute(
            select(MedicalDocument).order_by(MedicalDocument.created_at.desc())
        ).scalars().all()
    elif user.role == UserRole.PATIENT:
        patient = db.execute(select(Patient).where(Patient.user_id == user.id)).scalar_one_or_none()
        documents = []
        if patient:
            documents = (
                db.execute(
                    select(MedicalDocument)
                    .where(MedicalDocument.patient_id == patient.id)
                    .order_by(MedicalDocument.created_at.desc())
                )
                .scalars()
                .all()
            )
    elif user.role == UserRole.DOCTOR:
        doctor = db.execute(select(Doctor).where(Doctor.user_id == user.id)).scalar_one_or_none()
        documents = []
        if doctor:
            patient_ids = select(Appointment.patient_id).where(Appointment.doctor_id == doctor.id)
            documents = (
                db.execute(
                    select(MedicalDocument)
                    .where(MedicalDocument.patient_id.in_(patient_ids))
                    .order_by(MedicalDocument.created_at.desc())
                )
                .scalars()
                .all()
            )
    else:
        documents = []

    return [serialize_document(doc) for doc in documents]


@router.get("/{document_id}", summary="View a single document with its extracted text")
def get_document(
    document_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    document = _load_document(db, document_id)
    if not _can_access(db, user, document):
        raise HTTPException(status_code=403, detail="You do not have access to this document")
    return serialize_document(document, include_text=True)


@router.get("/{document_id}/download", summary="Download the original file (authenticated)")
def download_document(
    document_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    document = _load_document(db, document_id)
    if not _can_access(db, user, document):
        raise HTTPException(status_code=403, detail="You do not have access to this document")
    if not document.file_path or not os.path.exists(document.file_path):
        raise HTTPException(status_code=410, detail="The stored file is no longer available")

    safe_name = os.path.basename(document.filename) or "document"
    media = {
        "PDF": "application/pdf",
        "TXT": "text/plain",
        "PNG": "image/png",
        "JPG": "image/jpeg",
        "JPEG": "image/jpeg",
    }.get(document.file_type, "application/octet-stream")

    return FileResponse(document.file_path, media_type=media, filename=safe_name)


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a document")
def delete_document(
    document_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    document = _load_document(db, document_id)

    is_owner = user.role == UserRole.PATIENT and document.patient_id == _safe_patient_id(db, user)
    if not is_owner and user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="You can only delete your own documents")

    remove_file(document.file_path)
    audit(db, user.id, "delete_document", "medical_documents", document.id)
    db.delete(document)
    db.commit()
    return None
