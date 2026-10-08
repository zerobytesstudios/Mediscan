from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.appointment import DoctorBrief, PatientBrief


class MedicalRecordCreate(BaseModel):
    patient_id: int
    title: str = Field(..., min_length=2, max_length=200)
    notes: str | None = None
    diagnosis_notes: str | None = None
    prescription: str | None = None


class MedicalRecordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: int
    doctor_id: int | None = None
    title: str
    notes: str | None = None
    diagnosis_notes: str | None = None
    prescription: str | None = None
    created_at: datetime


class MedicalRecordDetailOut(MedicalRecordOut):
    patient: PatientBrief | None = None
    doctor: DoctorBrief | None = None


class ConsultationCreate(BaseModel):
    appointment_id: int
    notes: str = Field(..., min_length=2)
    follow_up_date: datetime | None = None
    create_medical_record: bool = True
    record_title: str | None = Field(None, max_length=200)


class ConsultationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    appointment_id: int
    doctor_id: int
    patient_id: int
    notes: str | None = None
    follow_up_date: datetime | None = None
    created_at: datetime
