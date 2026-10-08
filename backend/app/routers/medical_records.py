"""Medical records (patient history) endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models import Appointment, Doctor, MedicalRecord, Patient, User, UserRole
from app.schemas.medical import MedicalRecordCreate, MedicalRecordDetailOut
from app.services.audit import audit, notify
from app.utils.serialize import serialize_doctor, serialize_patient

router = APIRouter(prefix="/api/medical-records", tags=["Medical Records"])


def _serialize(record: MedicalRecord) -> dict:
    data = {
        "id": record.id,
        "patient_id": record.patient_id,
        "doctor_id": record.doctor_id,
        "title": record.title,
        "notes": record.notes,
        "diagnosis_notes": record.diagnosis_notes,
        "prescription": record.prescription,
        "created_at": record.created_at,
    }
    if record.patient is not None:
        data["patient"] = serialize_patient(record.patient)
        data["patient"]["full_name"] = record.patient.user.full_name
        data["patient"]["email"] = record.patient.user.email
        data["patient"]["phone"] = record.patient.user.phone
    if record.doctor is not None:
        data["doctor"] = serialize_doctor(record.doctor)
    return data


def _base_query(db: Session):
    return db.query(MedicalRecord).options(
        joinedload(MedicalRecord.patient).joinedload(Patient.user),
        joinedload(MedicalRecord.doctor).joinedload(Doctor.user),
    )


@router.get("", response_model=list[MedicalRecordDetailOut], summary="List medical records visible to the current user")
def list_records(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = _base_query(db).order_by(MedicalRecord.created_at.desc())

    if user.role == UserRole.PATIENT:
        patient = db.execute(select(Patient).where(Patient.user_id == user.id)).scalar_one_or_none()
        records = [] if patient is None else query.filter(MedicalRecord.patient_id == patient.id).all()
    elif user.role == UserRole.DOCTOR:
        doctor = db.execute(select(Doctor).where(Doctor.user_id == user.id)).scalar_one_or_none()
        if doctor is None:
            records = []
        else:
            patient_ids = select(Appointment.patient_id).where(Appointment.doctor_id == doctor.id)
            records = query.filter(MedicalRecord.patient_id.in_(patient_ids)).all()
    elif user.role == UserRole.ADMIN:
        records = query.all()
    else:
        records = []

    return [_serialize(record) for record in records]


@router.post(
    "",
    response_model=MedicalRecordDetailOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a medical record for a patient",
)
def create_record(
    payload: MedicalRecordCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role not in {UserRole.DOCTOR, UserRole.ADMIN}:
        raise HTTPException(status_code=403, detail="Only doctors or admins can create records")

    patient = db.get(Patient, payload.patient_id)
    if patient is None:
        raise HTTPException(status_code=404, detail="Patient not found")

    doctor_id = None
    if user.role == UserRole.DOCTOR:
        doctor = db.execute(select(Doctor).where(Doctor.user_id == user.id)).scalar_one_or_none()
        if doctor is None:
            raise HTTPException(status_code=404, detail="Doctor profile not found")
        has_appointment = (
            db.execute(
                select(Appointment.id)
                .where(
                    Appointment.doctor_id == doctor.id,
                    Appointment.patient_id == patient.id,
                )
                .limit(1)
            ).first()
        )
        if has_appointment is None:
            raise HTTPException(
                status_code=403,
                detail="You can only add records for patients with an appointment",
            )
        doctor_id = doctor.id

    record = MedicalRecord(
        patient_id=patient.id,
        doctor_id=doctor_id,
        title=payload.title.strip(),
        notes=payload.notes,
        diagnosis_notes=payload.diagnosis_notes,
        prescription=payload.prescription,
    )
    db.add(record)
    db.flush()

    notify(
        db,
        patient.user_id,
        "New medical record",
        f"A medical record was added: {record.title}",
    )
    audit(db, user.id, "create_medical_record", "medical_records", record.id)
    db.commit()
    db.refresh(record)
    return _serialize(record)
