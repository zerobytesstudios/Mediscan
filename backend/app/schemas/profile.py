from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class PatientOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    date_of_birth: date | None = None
    gender: str | None = None
    blood_group: str | None = None
    address: str | None = None
    emergency_contact: str | None = None
    allergies: str | None = None
    chronic_conditions: str | None = None
    created_at: datetime


class PatientUpdate(BaseModel):
    date_of_birth: date | None = None
    gender: str | None = Field(None, max_length=20)
    blood_group: str | None = Field(None, max_length=10)
    address: str | None = Field(None, max_length=255)
    emergency_contact: str | None = Field(None, max_length=50)
    allergies: str | None = None
    chronic_conditions: str | None = None


class HospitalBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    address: str | None = None
    phone: str | None = None


class DoctorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    full_name: str
    email: str | None = None
    phone: str | None = None
    specialization: str | None = None
    qualification: str | None = None
    experience: int | None = None
    consultation_fee: float | None = None
    hospital_id: int | None = None
    hospital: HospitalBrief | None = None
    bio: str | None = None
    is_verified: bool = False
    created_at: datetime


class DoctorUpdate(BaseModel):
    specialization: str | None = Field(None, max_length=120)
    qualification: str | None = Field(None, max_length=150)
    experience: int | None = Field(None, ge=0, le=80)
    consultation_fee: float | None = Field(None, ge=0)
    hospital_id: int | None = None
    bio: str | None = None


class HospitalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    name: str
    address: str | None = None
    phone: str | None = None
    description: str | None = None
    created_at: datetime


class HospitalUpdate(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    address: str | None = Field(None, max_length=255)
    phone: str | None = Field(None, max_length=30)
    description: str | None = None
