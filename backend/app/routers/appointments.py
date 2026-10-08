"""Appointment booking and status management."""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.dependencies.auth import get_current_user, require_patient
from app.models import (
    Appointment,
    AppointmentStatus,
    ConsultationMode,
    Doctor,
    Hospital,
    Patient,
    User,
    UserRole,
)
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentDetailOut,
    AppointmentOut,
    AppointmentStatusUpdate,
)
from app.services.audit import audit, notify
from app.utils.serialize import serialize_appointment, serialize_appointment_detail

router = APIRouter(prefix="/api/appointments", tags=["Appointments"])


def _load(db: Session, appointment_id: int) -> Appointment:
    appointment = (
        db.query(Appointment)
        .options(
            joinedload(Appointment.patient).joinedload(Patient.user),
            joinedload(Appointment.doctor).joinedload(Doctor.user),
        )
        .filter(Appointment.id == appointment_id)
        .first()
    )
    if appointment is None:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appointment


def _can_view(db: Session, user: User, appointment: Appointment) -> bool:
    if user.role == UserRole.ADMIN:
        return True
    if user.role == UserRole.PATIENT:
        patient = db.execute(select(Patient).where(Patient.user_id == user.id)).scalar_one_or_none()
        return patient is not None and patient.id == appointment.patient_id
    if user.role == UserRole.DOCTOR:
        doctor = db.execute(select(Doctor).where(Doctor.user_id == user.id)).scalar_one_or_none()
        return doctor is not None and doctor.id == appointment.doctor_id
    if user.role == UserRole.HOSPITAL:
        hospital = db.execute(
            select(Hospital).where(Hospital.user_id == user.id)
        ).scalar_one_or_none()
        if hospital is None:
            return False
        doctor = db.get(Doctor, appointment.doctor_id)
        return doctor is not None and doctor.hospital_id == hospital.id
    return False


def _patient_appointments(db: Session, user: User, detail: bool) -> list[dict]:
    patient = db.execute(select(Patient).where(Patient.user_id == user.id)).scalar_one_or_none()
    if patient is None:
        return []
    rows = _query(db).filter(Appointment.patient_id == patient.id).all()
    return [_serialize(row, detail) for row in rows]


def _doctor_appointments(db: Session, user: User, detail: bool) -> list[dict]:
    doctor = db.execute(select(Doctor).where(Doctor.user_id == user.id)).scalar_one_or_none()
    if doctor is None:
        return []
    rows = _query(db).filter(Appointment.doctor_id == doctor.id).all()
    return [_serialize(row, detail) for row in rows]


def _hospital_appointments(db: Session, user: User, detail: bool) -> list[dict]:
    hospital = db.execute(select(Hospital).where(Hospital.user_id == user.id)).scalar_one_or_none()
    if hospital is None:
        return []
    doctor_ids = select(Doctor.id).where(Doctor.hospital_id == hospital.id)
    rows = _query(db).filter(Appointment.doctor_id.in_(doctor_ids)).all()
    return [_serialize(row, detail) for row in rows]


def _query(db: Session):
    return (
        db.query(Appointment)
        .options(
            joinedload(Appointment.patient).joinedload(Patient.user),
            joinedload(Appointment.doctor).joinedload(Doctor.user),
        )
        .order_by(Appointment.appointment_date.desc(), Appointment.appointment_time)
    )


def _serialize(appointment: Appointment, detail: bool) -> dict:
    if detail:
        return serialize_appointment_detail(appointment)
    return serialize_appointment(appointment)


@router.post(
    "",
    response_model=AppointmentOut,
    status_code=status.HTTP_201_CREATED,
    summary="Book an appointment with a doctor",
)
def book_appointment(
    payload: AppointmentCreate,
    user: User = Depends(require_patient),
    db: Session = Depends(get_db),
):
    patient = db.execute(select(Patient).where(Patient.user_id == user.id)).scalar_one_or_none()
    if patient is None:
        raise HTTPException(status_code=400, detail="Complete your patient profile first.")

    doctor = db.get(Doctor, payload.doctor_id)
    if doctor is None:
        raise HTTPException(status_code=404, detail="Doctor not found")

    appointment_date = payload.appointment_date
    if appointment_date.tzinfo is not None:
        appointment_date = appointment_date.replace(tzinfo=None)
    if appointment_date < datetime.now():
        raise HTTPException(status_code=400, detail="Appointment date cannot be in the past.")

    conflict = (
        db.execute(
            select(Appointment).where(
                Appointment.doctor_id == doctor.id,
                Appointment.appointment_date == appointment_date,
                Appointment.appointment_time == payload.appointment_time,
                Appointment.status.notin_(
                    [AppointmentStatus.CANCELLED, AppointmentStatus.COMPLETED]
                ),
            )
        ).scalar_one_or_none()
    )
    if conflict is not None:
        raise HTTPException(
            status_code=409, detail="That time slot is already booked. Please pick another slot."
        )

    appointment = Appointment(
        patient_id=patient.id,
        doctor_id=doctor.id,
        appointment_date=appointment_date,
        appointment_time=payload.appointment_time,
        consultation_mode=ConsultationMode(payload.consultation_mode),
        status=AppointmentStatus.PENDING,
        reason=payload.reason,
    )
    db.add(appointment)
    db.flush()

    notify(
        db,
        doctor.user_id,
        "New appointment request",
        f"{user.full_name} requested an appointment on "
        f"{payload.appointment_date:%d %b %Y} at {payload.appointment_time}.",
    )
    audit(db, user.id, "book_appointment", "appointments", appointment.id)
    db.commit()
    db.refresh(appointment)
    return serialize_appointment(appointment)


@router.get("", summary="List appointments for the current user")
def list_appointments(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    detail: bool = False,
):
    if user.role == UserRole.PATIENT:
        return _patient_appointments(db, user, detail)
    if user.role == UserRole.DOCTOR:
        return _doctor_appointments(db, user, detail)
    if user.role == UserRole.HOSPITAL:
        return _hospital_appointments(db, user, detail)

    rows = _query(db).all()
    return [_serialize(row, detail) for row in rows]


@router.get("/{appointment_id}", response_model=AppointmentDetailOut, summary="View an appointment")
def get_appointment(
    appointment_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    appointment = _load(db, appointment_id)
    if not _can_view(db, user, appointment):
        raise HTTPException(status_code=403, detail="You do not have access to this appointment")
    return serialize_appointment_detail(appointment)


@router.put(
    "/{appointment_id}/status",
    response_model=AppointmentOut,
    summary="Update appointment status",
)
def update_status(
    appointment_id: int,
    payload: AppointmentStatusUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    appointment = _load(db, appointment_id)
    new_status = AppointmentStatus(payload.status)

    doctor = None
    patient = None
    if user.role == UserRole.DOCTOR:
        doctor = db.execute(select(Doctor).where(Doctor.user_id == user.id)).scalar_one_or_none()
        if doctor is None or doctor.id != appointment.doctor_id:
            raise HTTPException(status_code=403, detail="This is not your appointment")
    elif user.role == UserRole.PATIENT:
        patient = db.execute(select(Patient).where(Patient.user_id == user.id)).scalar_one_or_none()
        if patient is None or patient.id != appointment.patient_id:
            raise HTTPException(status_code=403, detail="This is not your appointment")
        if new_status not in {AppointmentStatus.CANCELLED, AppointmentStatus.PENDING}:
            raise HTTPException(status_code=403, detail="Patients can only cancel an appointment")
    elif user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="You do not have permission")

    appointment.status = new_status

    if patient is None:
        appointment_patient = appointment.patient
        if appointment_patient is not None:
            notify(
                db,
                appointment_patient.user_id,
                "Appointment updated",
                f"Your appointment #{appointment.id} is now {new_status.value}.",
            )
    if doctor is None:
        appointment_doctor = appointment.doctor
        if appointment_doctor is not None and new_status == AppointmentStatus.CANCELLED:
            notify(
                db,
                appointment_doctor.user_id,
                "Appointment cancelled",
                f"Appointment #{appointment.id} was cancelled by the patient.",
            )

    audit(db, user.id, "update_appointment_status", "appointments", appointment.id)
    db.commit()
    db.refresh(appointment)
    return serialize_appointment(appointment)
