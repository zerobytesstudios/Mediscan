"""Consultation notes written by doctors after an appointment."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.dependencies.auth import get_current_user, require_doctor
from app.models import (
    Appointment,
    AppointmentStatus,
    Consultation,
    Doctor,
    MedicalRecord,
    Patient,
    User,
    UserRole,
)
from app.schemas.medical import ConsultationCreate, ConsultationOut
from app.services.audit import audit, notify

router = APIRouter(prefix="/api/consultations", tags=["Consultations"])


def _serialize(consultation: Consultation) -> dict:
    return {
        "id": consultation.id,
        "appointment_id": consultation.appointment_id,
        "doctor_id": consultation.doctor_id,
        "patient_id": consultation.patient_id,
        "notes": consultation.notes,
        "follow_up_date": consultation.follow_up_date,
        "created_at": consultation.created_at,
        "patient_name": (
            consultation.patient.user.full_name if consultation.patient and consultation.patient.user else None
        ),
        "doctor_name": (
            consultation.doctor.user.full_name if consultation.doctor and consultation.doctor.user else None
        ),
        "appointment_date": consultation.appointment.appointment_date if consultation.appointment else None,
        "appointment_time": consultation.appointment.appointment_time if consultation.appointment else None,
    }


def _query(db: Session):
    return db.query(Consultation).options(
        joinedload(Consultation.patient).joinedload(Patient.user),
        joinedload(Consultation.doctor).joinedload(Doctor.user),
        joinedload(Consultation.appointment),
    )


@router.post(
    "",
    response_model=ConsultationOut,
    status_code=status.HTTP_201_CREATED,
    summary="Write consultation notes for a completed appointment",
)
def create_consultation(
    payload: ConsultationCreate,
    user: User = Depends(require_doctor),
    db: Session = Depends(get_db),
):
    doctor = db.execute(select(Doctor).where(Doctor.user_id == user.id)).scalar_one_or_none()
    if doctor is None:
        raise HTTPException(status_code=404, detail="Doctor profile not found")

    appointment = db.get(Appointment, payload.appointment_id)
    if appointment is None:
        raise HTTPException(status_code=404, detail="Appointment not found")
    if appointment.doctor_id != doctor.id:
        raise HTTPException(status_code=403, detail="This is not your appointment")

    existing = (
        db.execute(select(Consultation).where(Consultation.appointment_id == appointment.id))
        .scalar_one_or_none()
    )
    if existing is not None:
        raise HTTPException(status_code=409, detail="Consultation notes already exist for this appointment")

    consultation = Consultation(
        appointment_id=appointment.id,
        doctor_id=doctor.id,
        patient_id=appointment.patient_id,
        notes=payload.notes.strip(),
        follow_up_date=payload.follow_up_date,
    )
    db.add(consultation)
    db.flush()

    if appointment.status in {AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED}:
        appointment.status = AppointmentStatus.COMPLETED

    if payload.create_medical_record:
        title = (payload.record_title or f"Consultation {appointment.appointment_date:%d %b %Y}").strip()
        record = MedicalRecord(
            patient_id=appointment.patient_id,
            doctor_id=doctor.id,
            title=title,
            notes=payload.notes.strip(),
        )
        db.add(record)
        db.flush()

        patient = db.get(Patient, appointment.patient_id)
        if patient is not None:
            notify(db, patient.user_id, "Consultation notes added", f"New consultation record: {title}")

    audit(db, user.id, "create_consultation", "consultations", consultation.id)
    db.commit()
    db.refresh(consultation)
    return _serialize(consultation)


@router.get("", summary="List consultations for the current user")
def list_consultations(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = _query(db).order_by(Consultation.created_at.desc())

    if user.role == UserRole.DOCTOR:
        doctor = db.execute(select(Doctor).where(Doctor.user_id == user.id)).scalar_one_or_none()
        rows = [] if doctor is None else query.filter(Consultation.doctor_id == doctor.id).all()
    elif user.role == UserRole.PATIENT:
        patient = db.execute(select(Patient).where(Patient.user_id == user.id)).scalar_one_or_none()
        rows = [] if patient is None else query.filter(Consultation.patient_id == patient.id).all()
    elif user.role == UserRole.ADMIN:
        rows = query.all()
    else:
        rows = []

    return [_serialize(row) for row in rows]
