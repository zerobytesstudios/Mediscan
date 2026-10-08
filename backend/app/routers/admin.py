"""Admin dashboard endpoints: stats and entity management."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.dependencies.auth import require_admin
from app.models import (
    Appointment,
    Doctor,
    Hospital,
    MedicalDocument,
    MedicalRecord,
    Notification,
    Patient,
    User,
    UserRole,
)
from app.schemas.admin import AdminStats
from app.schemas.appointment import AppointmentDetailOut
from app.schemas.auth import UserOut
from app.schemas.profile import DoctorOut, HospitalOut
from app.services.audit import audit
from app.utils.serialize import serialize_doctor, serialize_hospital, serialize_user

router = APIRouter(prefix="/api/admin", tags=["Admin"])


@router.get("/stats", response_model=AdminStats, summary="Platform statistics")
def stats(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    def count(model, *filters) -> int:
        return db.execute(select(func.count()).select_from(model).where(*filters)).scalar_one()

    role_users = select(User.role).where(User.role != UserRole.ADMIN)
    return AdminStats(
        total_users=count(User),
        patients=count(User, User.role == UserRole.PATIENT),
        doctors=count(Doctor),
        hospitals=count(Hospital),
        documents=count(MedicalDocument),
        appointments=count(Appointment),
        pending_doctor_approvals=count(Doctor, Doctor.is_verified.is_(False)),
        unread_notifications=count(Notification, Notification.is_read.is_(False)),
    )


@router.get("/users", response_model=list[UserOut], summary="List all users")
def list_users(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
    role: str | None = None,
):
    query = select(User).options(joinedload(User.patient)).order_by(User.created_at.desc())
    if role:
        try:
            query = query.where(User.role == UserRole(role))
        except ValueError:
            raise HTTPException(status_code=400, detail="Unknown role filter")
    return [serialize_user(user) for user in db.execute(query).scalars().all()]


@router.get("/doctors", response_model=list[DoctorOut], summary="List all doctors")
def list_doctors(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    doctors = (
        db.query(Doctor)
        .options(joinedload(Doctor.hospital), joinedload(Doctor.user))
        .order_by(Doctor.is_verified, Doctor.created_at.desc())
        .all()
    )
    return [serialize_doctor(doctor) for doctor in doctors]


@router.put(
    "/doctors/{doctor_id}/verify",
    response_model=DoctorOut,
    summary="Approve or revoke a doctor's verification",
)
def verify_doctor(
    doctor_id: int,
    verified: bool = True,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    doctor = (
        db.query(Doctor)
        .options(joinedload(Doctor.hospital), joinedload(Doctor.user))
        .filter(Doctor.id == doctor_id)
        .first()
    )
    if doctor is None:
        raise HTTPException(status_code=404, detail="Doctor not found")

    doctor.is_verified = verified
    notify_message = (
        "Your doctor profile has been verified by the Mediscan AI team."
        if verified
        else "Your doctor verification has been paused by the Mediscan AI team."
    )
    db.add(Notification(user_id=doctor.user_id, title="Profile status updated", message=notify_message))

    audit(db, admin.id, "verify_doctor", "doctors", doctor.id)
    db.commit()
    db.refresh(doctor)
    return serialize_doctor(doctor)


@router.get("/hospitals", response_model=list[HospitalOut], summary="List all hospitals")
def list_hospitals(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    hospitals = db.execute(select(Hospital).order_by(Hospital.name)).scalars().all()
    return [serialize_hospital(hospital) for hospital in hospitals]


@router.get(
    "/appointments",
    response_model=list[AppointmentDetailOut],
    summary="List all appointments",
)
def list_appointments(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    from app.routers.appointments import _query, _serialize

    return [_serialize(row, True) for row in _query(db).all()]


@router.get("/documents", summary="Overview of all uploaded documents")
def list_documents(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    from app.utils.serialize import serialize_document

    documents = (
        db.execute(select(MedicalDocument).order_by(MedicalDocument.created_at.desc()))
        .scalars()
        .all()
    )
    return [serialize_document(document) for document in documents]
