"""Helpers that turn ORM objects into plain dicts for Pydantic responses."""
from app.models import Appointment, Doctor, Hospital, MedicalDocument, Patient, User


def serialize_user(user: User) -> dict:
    return {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "phone": user.phone,
        "role": user.role.value if hasattr(user.role, "value") else str(user.role),
        "is_active": user.is_active,
        "created_at": user.created_at,
    }


def serialize_patient(patient: Patient) -> dict:
    return {
        "id": patient.id,
        "user_id": patient.user_id,
        "date_of_birth": patient.date_of_birth,
        "gender": patient.gender,
        "blood_group": patient.blood_group,
        "address": patient.address,
        "emergency_contact": patient.emergency_contact,
        "allergies": patient.allergies,
        "chronic_conditions": patient.chronic_conditions,
        "created_at": patient.created_at,
    }


def _hospital_brief(hospital: Hospital | None) -> dict | None:
    if hospital is None:
        return None
    return {
        "id": hospital.id,
        "name": hospital.name,
        "address": hospital.address,
        "phone": hospital.phone,
    }


def serialize_doctor(doctor: Doctor, user: User | None = None) -> dict:
    user = user or doctor.user
    return {
        "id": doctor.id,
        "user_id": doctor.user_id,
        "full_name": user.full_name if user else "",
        "email": user.email if user else None,
        "phone": user.phone if user else None,
        "specialization": doctor.specialization,
        "qualification": doctor.qualification,
        "experience": doctor.experience,
        "consultation_fee": doctor.consultation_fee,
        "hospital_id": doctor.hospital_id,
        "hospital": _hospital_brief(doctor.hospital),
        "bio": doctor.bio,
        "is_verified": doctor.is_verified,
        "created_at": doctor.created_at,
    }


def serialize_hospital(hospital: Hospital) -> dict:
    return {
        "id": hospital.id,
        "user_id": hospital.user_id,
        "name": hospital.name,
        "address": hospital.address,
        "phone": hospital.phone,
        "description": hospital.description,
        "created_at": hospital.created_at,
    }


def serialize_document(document: MedicalDocument, include_text: bool = False) -> dict:
    data = {
        "id": document.id,
        "patient_id": document.patient_id,
        "filename": document.filename,
        "file_type": document.file_type,
        "file_size": document.file_size,
        "document_type": document.document_type,
        "extraction_status": document.extraction_status,
        "ai_summary": document.ai_summary,
        "created_at": document.created_at,
    }
    if include_text:
        data["extracted_text"] = document.extracted_text
    return data


def serialize_appointment(appointment: Appointment) -> dict:
    return {
        "id": appointment.id,
        "patient_id": appointment.patient_id,
        "doctor_id": appointment.doctor_id,
        "appointment_date": appointment.appointment_date,
        "appointment_time": appointment.appointment_time,
        "consultation_mode": appointment.consultation_mode.value,
        "status": appointment.status.value,
        "reason": appointment.reason,
        "created_at": appointment.created_at,
    }


def serialize_appointment_detail(appointment: Appointment) -> dict:
    data = serialize_appointment(appointment)

    patient = appointment.patient
    if patient is not None:
        user = patient.user
        data["patient"] = {
            "id": patient.id,
            "user_id": patient.user_id,
            "full_name": user.full_name if user else "",
            "email": user.email if user else None,
            "phone": user.phone if user else None,
            "gender": patient.gender,
            "date_of_birth": patient.date_of_birth,
            "blood_group": patient.blood_group,
            "allergies": patient.allergies,
        }

    doctor = appointment.doctor
    if doctor is not None:
        duser = doctor.user
        data["doctor"] = {
            "id": doctor.id,
            "user_id": doctor.user_id,
            "full_name": duser.full_name if duser else "",
            "specialization": doctor.specialization,
            "qualification": doctor.qualification,
            "consultation_fee": doctor.consultation_fee,
            "is_verified": doctor.is_verified,
        }
    return data
