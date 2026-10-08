"""Hospital directory and hospital profile management."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import require_hospital
from app.models import Hospital, User
from app.schemas.profile import HospitalOut, HospitalUpdate
from app.services.audit import audit
from app.utils.serialize import serialize_hospital

router = APIRouter(prefix="/api/hospitals", tags=["Hospitals"])


@router.get("", response_model=list[HospitalOut], summary="List hospitals")
def list_hospitals(db: Session = Depends(get_db)):
    hospitals = db.execute(select(Hospital).order_by(Hospital.name)).scalars().all()
    return [serialize_hospital(h) for h in hospitals]


@router.get("/{hospital_id}", response_model=HospitalOut, summary="View a hospital profile")
def get_hospital(hospital_id: int, db: Session = Depends(get_db)):
    hospital = db.get(Hospital, hospital_id)
    if hospital is None:
        raise HTTPException(status_code=404, detail="Hospital not found")
    return serialize_hospital(hospital)


@router.get("/me/profile", response_model=HospitalOut, summary="Get my hospital profile")
def get_my_profile(user: User = Depends(require_hospital), db: Session = Depends(get_db)):
    hospital = db.execute(select(Hospital).where(Hospital.user_id == user.id)).scalar_one_or_none()
    if hospital is None:
        raise HTTPException(status_code=404, detail="Hospital profile not found")
    return serialize_hospital(hospital)


@router.put("/me", response_model=HospitalOut, summary="Update my hospital profile")
def update_my_profile(
    payload: HospitalUpdate,
    user: User = Depends(require_hospital),
    db: Session = Depends(get_db),
):
    hospital = db.execute(select(Hospital).where(Hospital.user_id == user.id)).scalar_one_or_none()
    if hospital is None:
        raise HTTPException(status_code=404, detail="Hospital profile not found")

    for field, value in payload.model_dump().items():
        setattr(hospital, field, value)

    audit(db, user.id, "update_profile", "hospitals", hospital.id)
    db.commit()
    db.refresh(hospital)
    return serialize_hospital(hospital)
