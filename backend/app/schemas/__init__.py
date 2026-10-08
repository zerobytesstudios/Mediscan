from app.schemas.auth import LoginIn, RegisterIn, TokenOut, UserOut
from app.schemas.profile import (
    DoctorOut,
    DoctorUpdate,
    HospitalOut,
    HospitalUpdate,
    PatientOut,
    PatientUpdate,
)
from app.schemas.document import ChatIn, ChatOut, DocumentDetailOut, DocumentOut
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentDetailOut,
    AppointmentOut,
    AppointmentStatusUpdate,
)
from app.schemas.medical import (
    ConsultationCreate,
    ConsultationOut,
    MedicalRecordCreate,
    MedicalRecordDetailOut,
    MedicalRecordOut,
)
from app.schemas.notification import NotificationOut
from app.schemas.admin import AdminStats

__all__ = [
    "RegisterIn",
    "LoginIn",
    "TokenOut",
    "UserOut",
    "PatientOut",
    "PatientUpdate",
    "DoctorOut",
    "DoctorUpdate",
    "HospitalOut",
    "HospitalUpdate",
    "DocumentOut",
    "DocumentDetailOut",
    "ChatIn",
    "ChatOut",
    "AppointmentCreate",
    "AppointmentOut",
    "AppointmentDetailOut",
    "AppointmentStatusUpdate",
    "MedicalRecordCreate",
    "MedicalRecordOut",
    "MedicalRecordDetailOut",
    "ConsultationCreate",
    "ConsultationOut",
    "NotificationOut",
    "AdminStats",
]
