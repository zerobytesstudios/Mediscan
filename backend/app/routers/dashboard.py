"""Role-aware dashboard statistics."""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models import (
    Appointment,
    AppointmentStatus,
    Consultation,
    Doctor,
    Hospital,
    MedicalDocument,
    MedicalRecord,
    Notification,
    Patient,
    User,
    UserRole,
)

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/stats", summary="Statistics for the current user's dashboard")
def dashboard_stats(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role == UserRole.PATIENT:
        return _patient_stats(db, user)
    if user.role == UserRole.DOCTOR:
        return _doctor_stats(db, user)
    if user.role == UserRole.HOSPITAL:
        return _hospital_stats(db, user)
    raise HTTPException(status_code=400, detail="Use /api/admin/stats for the admin dashboard")


def _count(db: Session, model, *filters) -> int:
    return db.execute(select(func.count()).select_from(model).where(*filters)).scalar_one()


def _patient_stats(db: Session, user: User) -> dict:
    patient = db.execute(select(Patient).where(Patient.user_id == user.id)).scalar_one_or_none()
    if patient is None:
        return {
            "documents": 0,
            "ai_analyses": 0,
            "upcoming_appointments": 0,
            "total_appointments": 0,
            "medical_records": 0,
            "unread_notifications": _user_notifications(db, user.id),
        }

    now = datetime.now()
    upcoming = _count(
        db,
        Appointment,
        Appointment.patient_id == patient.id,
        Appointment.appointment_date >= now,
        Appointment.status.notin_([AppointmentStatus.CANCELLED, AppointmentStatus.COMPLETED]),
    )
    return {
        "documents": _count(db, MedicalDocument, MedicalDocument.patient_id == patient.id),
        "ai_analyses": _count(
            db,
            MedicalDocument,
            MedicalDocument.patient_id == patient.id,
            MedicalDocument.ai_summary.is_not(None),
        ),
        "upcoming_appointments": upcoming,
        "total_appointments": _count(db, Appointment, Appointment.patient_id == patient.id),
        "medical_records": _count(db, MedicalRecord, MedicalRecord.patient_id == patient.id),
        "unread_notifications": _user_notifications(db, user.id),
    }


def _doctor_stats(db: Session, user: User) -> dict:
    doctor = db.execute(select(Doctor).where(Doctor.user_id == user.id)).scalar_one_or_none()
    if doctor is None:
        return {"appointments": 0, "upcoming_appointments": 0, "patients": 0, "consultations": 0}

    now = datetime.now()
    patient_ids = select(Appointment.patient_id).where(Appointment.doctor_id == doctor.id)
    return {
        "appointments": _count(db, Appointment, Appointment.doctor_id == doctor.id),
        "upcoming_appointments": _count(
            db,
            Appointment,
            Appointment.doctor_id == doctor.id,
            Appointment.appointment_date >= now,
            Appointment.status.notin_([AppointmentStatus.CANCELLED, AppointmentStatus.COMPLETED]),
        ),
        "pending_requests": _count(
            db,
            Appointment,
            Appointment.doctor_id == doctor.id,
            Appointment.status == AppointmentStatus.PENDING,
        ),
        "patients": db.execute(
            select(func.count(func.distinct(Appointment.patient_id))).where(
                Appointment.doctor_id == doctor.id
            )
        ).scalar_one(),
        "consultations": _count(db, Consultation, Consultation.doctor_id == doctor.id),
        "is_verified": doctor.is_verified,
        "unread_notifications": _count(
            db, Notification, Notification.user_id == user.id, Notification.is_read.is_(False)
        ),
    }


def _hospital_stats(db: Session, user: User) -> dict:
    hospital = db.execute(select(Hospital).where(Hospital.user_id == user.id)).scalar_one_or_none()
    if hospital is None:
        return {"doctors": 0, "appointments": 0, "patients": 0}

    doctor_ids = select(Doctor.id).where(Doctor.hospital_id == hospital.id)
    return {
        "doctors": _count(db, Doctor, Doctor.hospital_id == hospital.id),
        "appointments": _count(db, Appointment, Appointment.doctor_id.in_(doctor_ids)),
        "patients": db.execute(
            select(func.count(func.distinct(Appointment.patient_id))).where(
                Appointment.doctor_id.in_(doctor_ids)
            )
        ).scalar_one(),
        "pending_approvals": _count(
            db, Doctor, Doctor.hospital_id == hospital.id, Doctor.is_verified.is_(False)
        ),
        "unread_notifications": _count(
            db, Notification, Notification.user_id == user.id, Notification.is_read.is_(False)
        ),
    }


def _user_notifications(db: Session, user_id: int) -> int:
    return _count(db, Notification, Notification.user_id == user_id, Notification.is_read.is_(False))
