from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class AppointmentCreate(BaseModel):
    doctor_id: int
    appointment_date: datetime
    appointment_time: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    consultation_mode: str = Field(default="in_person", pattern="^(in_person|online)$")
    reason: str | None = Field(None, max_length=1000)


class AppointmentStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(pending|confirmed|completed|cancelled)$")


class PatientBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: str | None = None
    phone: str | None = None
    gender: str | None = None
    date_of_birth: date | None = None
    blood_group: str | None = None
    allergies: str | None = None


class DoctorBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    specialization: str | None = None
    qualification: str | None = None
    consultation_fee: float | None = None
    is_verified: bool = False


class AppointmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: int
    doctor_id: int
    appointment_date: datetime
    appointment_time: str
    consultation_mode: str
    status: str
    reason: str | None = None
    created_at: datetime


class AppointmentDetailOut(AppointmentOut):
    patient: PatientBrief | None = None
    doctor: DoctorBrief | None = None
