"""Create tables and load clearly-labelled DEMO data.

Usage:
    python seed.py

Every account created here is a DEMO account with fake data only.
"""
import os
from datetime import date, datetime, timedelta

from sqlalchemy import select

from app.config import settings
from app.database import SessionLocal, init_db
from app.models import (
    Appointment,
    AppointmentStatus,
    Consultation,
    ConsultationMode,
    Doctor,
    Hospital,
    MedicalDocument,
    MedicalRecord,
    Notification,
    Patient,
    User,
    UserRole,
)
from app.utils.security import hash_password

DEMO_PASSWORD = "Demo@123"


def _get_or_create(db, model, filters: dict, defaults: dict | None = None):
    instance = db.execute(select(model).filter_by(**filters)).scalar_one_or_none()
    if instance is not None:
        return instance, False
    instance = model(**filters, **(defaults or {}))
    db.add(instance)
    db.flush()
    return instance, True


def _ensure_user(db, email: str, full_name: str, role: UserRole, password_hash: str):
    user, created = _get_or_create(
        db,
        User,
        filters={"email": email},
        defaults={
            "full_name": full_name,
            "password_hash": password_hash,
            "role": role,
            "phone": None,
            "is_active": True,
        },
    )
    if not created:
        user.full_name = full_name
        user.password_hash = password_hash
    return user, created


def seed() -> None:
    init_db()
    db = SessionLocal()
    created = {"users": 0, "doctors": 0, "patients": 0, "appointments": 0, "records": 0}

    try:
        demo_hash = hash_password(DEMO_PASSWORD)
        admin_hash = hash_password(settings.ADMIN_PASSWORD)

        # --- Admin (configured through environment variables) ---
        admin, admin_created = _ensure_user(
            db, settings.ADMIN_EMAIL.lower(), settings.ADMIN_NAME, UserRole.ADMIN, admin_hash
        )
        admin.phone = "+91-9000000000"
        if admin_created:
            created["users"] += 1

        # --- Hospital (DEMO) ---
        hospital_user, hospital_user_created = _ensure_user(
            db,
            "hospital.demo@mediscan.local",
            "Sunrise Multi-Speciality Hospital (DEMO)",
            UserRole.HOSPITAL,
            demo_hash,
        )
        if hospital_user_created:
            created["users"] += 1

        hospital, _ = _get_or_create(
            db,
            Hospital,
            filters={"user_id": hospital_user.id},
            defaults={
                "name": "Sunrise Multi-Speciality Hospital (DEMO)",
                "address": "12 MG Road, Bengaluru, Karnataka 560001",
                "phone": "+91-80-4000-1000",
                "description": "DEMO hospital created by seed.py. Not a real healthcare facility.",
            },
        )

        # --- Doctors (DEMO) ---
        demo_doctors = [
            ("Dr. Asha Verma (DEMO)", "doctor1.demo@mediscan.local", "Cardiology", "MD, DM Cardiology", 12, 800.0),
            ("Dr. Rohan Mehta (DEMO)", "doctor2.demo@mediscan.local", "General Medicine", "MBBS, MD", 7, 500.0),
            ("Dr. Kavya Nair (DEMO)", "doctor3.demo@mediscan.local", "Endocrinology", "MBBS, MD, DM", 9, 900.0),
            ("Dr. Imran Shaikh (DEMO)", "doctor4.demo@mediscan.local", "Orthopaedics", "MBBS, MS Ortho", 15, 700.0),
            ("Dr. Neha Reddy (DEMO)", "doctor5.demo@mediscan.local", "Dermatology", "MBBS, MD Derm", 6, 600.0),
        ]

        doctors = []
        for idx, (name, email, spec, qual, exp, fee) in enumerate(demo_doctors, start=1):
            user, user_created = _ensure_user(db, email, name, UserRole.DOCTOR, demo_hash)
            user.phone = f"+91-910000000{idx}"
            if user_created:
                created["users"] += 1

            doctor, doctor_created = _get_or_create(
                db,
                Doctor,
                filters={"user_id": user.id},
                defaults={
                    "specialization": spec,
                    "qualification": qual,
                    "experience": exp,
                    "consultation_fee": fee,
                    "hospital_id": hospital.id,
                    "bio": f"DEMO profile. {qual} with {exp} years of experience in {spec}.",
                    "is_verified": True,
                },
            )
            if doctor_created:
                created["doctors"] += 1
            doctors.append(doctor)

        # --- Patients (DEMO) ---
        demo_patients = [
            ("Aarav Sharma (DEMO)", "patient1.demo@mediscan.local", "male", "O+", "1994-03-12"),
            ("Diya Iyer (DEMO)", "patient2.demo@mediscan.local", "female", "B+", "1998-07-25"),
            ("Kabir Singh (DEMO)", "patient3.demo@mediscan.local", "male", "A+", "1987-11-02"),
        ]

        patients = []
        for idx, (name, email, gender, blood, dob) in enumerate(demo_patients, start=1):
            user, user_created = _ensure_user(db, email, name, UserRole.PATIENT, demo_hash)
            user.phone = f"+91-920000000{idx}"
            if user_created:
                created["users"] += 1

            patient, patient_created = _get_or_create(
                db,
                Patient,
                filters={"user_id": user.id},
                defaults={
                    "date_of_birth": date.fromisoformat(dob),
                    "gender": gender,
                    "blood_group": blood,
                    "address": f"DEMO address, Bengaluru {560000 + idx}",
                    "emergency_contact": f"+91-930000000{idx}",
                    "allergies": "None recorded (demo data)",
                    "chronic_conditions": "None recorded (demo data)",
                },
            )
            if patient_created:
                created["patients"] += 1
            patients.append((user, patient))

        # --- Appointments (DEMO) ---
        if db.execute(select(Appointment)).scalars().first() is None:
            slots = [
                (0, "10:00", ConsultationMode.IN_PERSON, AppointmentStatus.CONFIRMED,
                 "Routine follow-up for persistent fatigue"),
                (1, "11:30", ConsultationMode.ONLINE, AppointmentStatus.PENDING,
                 "Question about recent blood test results"),
                (3, "15:00", ConsultationMode.IN_PERSON, AppointmentStatus.PENDING,
                 "Knee pain while walking upstairs"),
                (5, "09:45", ConsultationMode.ONLINE, AppointmentStatus.CONFIRMED,
                 "Sugar level review"),
            ]
            for offset, time_slot, mode, status, reason in slots:
                db.add(
                    Appointment(
                        patient_id=patients[0][1].id if offset % 2 == 0 else patients[1][1].id,
                        doctor_id=doctors[offset % len(doctors)].id,
                        appointment_date=datetime.now() + timedelta(days=offset),
                        appointment_time=time_slot,
                        consultation_mode=mode,
                        status=status,
                        reason=reason,
                    )
                )
                created["appointments"] += 1
            db.flush()

        # --- Medical records (DEMO) ---
        if db.execute(select(MedicalRecord)).scalars().first() is None:
            records = [
                (
                    "Complete Blood Count (CBC) review",
                    "Haemoglobin slightly below the laboratory range.",
                    "Mild anaemia pattern - clinical correlation advised.",
                    "Iron rich diet; review in 4 weeks (demo record)",
                ),
                (
                    "Lipid profile discussion",
                    "LDL borderline high as per the report reference range.",
                    "Lifestyle and diet counselling provided.",
                    "No medication started (demo record)",
                ),
            ]
            for title, notes, diagnosis, prescription in records:
                db.add(
                    MedicalRecord(
                        patient_id=patients[0][1].id,
                        doctor_id=doctors[0].id,
                        title=title,
                        notes=notes,
                        diagnosis_notes=diagnosis,
                        prescription=prescription,
                    )
                )
                created["records"] += 1

        # --- A demo text document so AI analysis works immediately ---
        if db.execute(select(MedicalDocument)).scalars().first() is None:
            os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
            path = os.path.join(settings.UPLOAD_DIR, "demo-cbc-report.txt")
            content = (
                "DEMO LABORATORY REPORT - NOT A REAL PATIENT\n"
                "Patient: Aarav Sharma (DEMO)\n"
                "Test: Complete Blood Count (CBC)\n"
                "Haemoglobin: 11.2 g/dL\n"
                "RBC Count: 4.6 x10^12/L\n"
                "WBC Count: 7.1 x10^9/L\n"
                "Platelet Count: 245 x10^9/L\n"
                "MCV: 82 fL\n"
                "Reference ranges vary between laboratories.\n"
            )
            with open(path, "w", encoding="utf-8") as handle:
                handle.write(content)

            db.add(
                MedicalDocument(
                    patient_id=patients[0][1].id,
                    filename="demo-cbc-report.txt",
                    file_path=path,
                    file_type="TXT",
                    file_size=len(content),
                    document_type="Lab Report",
                    extracted_text=content,
                    extraction_status="extracted",
                )
            )

        # --- Welcome notification ---
        if db.execute(select(Notification)).scalars().first() is None:
            for user in db.execute(select(User)).scalars():
                db.add(
                    Notification(
                        user_id=user.id,
                        title="Welcome to Mediscan AI (DEMO)",
                        message="This demo account was created by seed.py. All data is fake.",
                    )
                )

        db.commit()
        print("=" * 62)
        print("SEED COMPLETE - ALL ACCOUNTS BELOW ARE DEMO ACCOUNTS")
        print("=" * 62)
        print(f"Admin    : {settings.ADMIN_EMAIL} / {settings.ADMIN_PASSWORD}")
        print(f"Doctor   : doctor1.demo@mediscan.local / {DEMO_PASSWORD}")
        print(f"Patient  : patient1.demo@mediscan.local / {DEMO_PASSWORD}")
        print(f"Hospital : hospital.demo@mediscan.local / {DEMO_PASSWORD}")
        print(f"Created  : {created}")
        print("=" * 62)
    finally:
        db.close()


if __name__ == "__main__":
    seed()
