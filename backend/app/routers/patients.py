"""Patient profile endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import require_patient
from app.models import Patient, User
from app.schemas.profile import PatientOut, PatientUpdate
from app.services.audit import audit
from app.utils.serialize import serialize_patient

router = APIRouter(prefix="/api/patients", tags=["Patients"])


def get_patient_for_user(db: Session, user: User) -> Patient:
    patient = db.query(Patient).filter(Patient.user_id == user.id).first()
    if patient is None:
        patient = Patient(user_id=user.id)
        db.add(patient)
        db.commit()
        db.refresh(patient)
    return patient


@router.get("/me", response_model=PatientOut, summary="Get my patient profile")
def get_my_profile(
    user: User = Depends(require_patient),
    db: Session = Depends(get_db),
):
    return serialize_patient(get_patient_for_user(db, user))


@router.put("/me", response_model=PatientOut, summary="Update my patient profile")
def update_my_profile(
    payload: PatientUpdate,
    user: User = Depends(require_patient),
    db: Session = Depends(get_db),
):
    patient = get_patient_for_user(db, user)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(patient, field, value)
    audit(db, user.id, "update_profile", "patients", patient.id)
    db.commit()
    db.refresh(patient)
    return serialize_patient(patient)
