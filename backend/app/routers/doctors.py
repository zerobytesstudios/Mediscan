"""Public doctor directory and doctor profile management."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.dependencies.auth import get_current_user, require_doctor
from app.models import Doctor, Hospital, User
from app.schemas.profile import DoctorOut, DoctorUpdate
from app.services.audit import audit
from app.utils.serialize import serialize_doctor

router = APIRouter(prefix="/api/doctors", tags=["Doctors"])


@router.get("", response_model=list[DoctorOut], summary="Search doctors")
def search_doctors(
    db: Session = Depends(get_db),
    q: str | None = Query(None, description="Name or specialization keyword"),
    specialization: str | None = None,
    hospital_id: int | None = None,
    min_experience: int | None = Query(None, ge=0),
    verified: bool | None = None,
):
    query = (
        select(Doctor)
        .join(User, Doctor.user_id == User.id)
        .options(joinedload(Doctor.hospital), joinedload(Doctor.user))
        .where(User.is_active.is_(True))
    )

    if q:
        term = f"%{q.strip()}%"
        query = query.where(
            or_(
                User.full_name.ilike(term),
                Doctor.specialization.ilike(term),
                Doctor.qualification.ilike(term),
            )
        )
    if specialization:
        query = query.where(Doctor.specialization.ilike(f"%{specialization.strip()}%"))
    if hospital_id is not None:
        query = query.where(Doctor.hospital_id == hospital_id)
    if min_experience is not None:
        query = query.where(Doctor.experience >= min_experience)
    if verified is not None:
        query = query.where(Doctor.is_verified.is_(verified))

    doctors = db.execute(query.order_by(Doctor.is_verified.desc(), User.full_name)).scalars().all()
    return [serialize_doctor(doc) for doc in doctors]


@router.get("/{doctor_id}", response_model=DoctorOut, summary="View a doctor profile")
def get_doctor(doctor_id: int, db: Session = Depends(get_db)):
    doctor = (
        db.query(Doctor)
        .options(joinedload(Doctor.hospital), joinedload(Doctor.user))
        .filter(Doctor.id == doctor_id)
        .first()
    )
    if doctor is None:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return serialize_doctor(doctor)


@router.put("/me", response_model=DoctorOut, summary="Update my doctor profile")
def update_my_profile(
    payload: DoctorUpdate,
    user: User = Depends(require_doctor),
    db: Session = Depends(get_db),
):
    doctor = (
        db.query(Doctor)
        .options(joinedload(Doctor.hospital), joinedload(Doctor.user))
        .filter(Doctor.user_id == user.id)
        .first()
    )
    if doctor is None:
        raise HTTPException(status_code=404, detail="Doctor profile not found")

    data = payload.model_dump(exclude_unset=True)
    if "hospital_id" in data and data["hospital_id"] is not None:
        if db.get(Hospital, data["hospital_id"]) is None:
            raise HTTPException(status_code=400, detail="Selected hospital does not exist")

    for field, value in data.items():
        setattr(doctor, field, value)

    audit(db, user.id, "update_profile", "doctors", doctor.id)
    db.commit()
    db.refresh(doctor)
    return serialize_doctor(doctor)


@router.get("/me/profile", response_model=DoctorOut, summary="Get my doctor profile")
def get_my_profile(user: User = Depends(require_doctor), db: Session = Depends(get_db)):
    doctor = (
        db.query(Doctor)
        .options(joinedload(Doctor.hospital), joinedload(Doctor.user))
        .filter(Doctor.user_id == user.id)
        .first()
    )
    if doctor is None:
        raise HTTPException(status_code=404, detail="Doctor profile not found")
    return serialize_doctor(doctor)
