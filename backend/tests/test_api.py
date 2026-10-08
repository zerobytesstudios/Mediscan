"""Basic backend tests (pytest).

Run from the backend folder:
    .venv\\Scripts\\python.exe -m pytest tests -q

The tests use the configured PostgreSQL database and only create
idempotent, clearly disposable records.
"""
import random
import uuid
from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)
TAG = uuid.uuid4().hex[:8]


@pytest.fixture()
def patient_token():
    email = f"pytest.patient.{uuid.uuid4().hex[:10]}@example.com"
    response = client.post(
        "/api/auth/register",
        json={
            "full_name": "Pytest Patient",
            "email": email,
            "password": "Secret123",
            "phone": "+91-9000000000",
            "role": "patient",
        },
    )
    assert response.status_code == 201, response.text
    return response.json()["access_token"]


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "Mediscan AI API"}


def test_register_and_me(patient_token):
    response = client.get("/api/auth/me", headers=auth(patient_token))
    assert response.status_code == 200
    assert response.json()["role"] == "patient"


def test_admin_registration_is_blocked():
    response = client.post(
        "/api/auth/register",
        json={
            "full_name": "Not Admin",
            "email": f"pytest.admin.{TAG}@example.com",
            "password": "Secret123",
            "role": "admin",
        },
    )
    assert response.status_code in (400, 422)


def test_login_success_and_failure():
    email = f"pytest.login.{TAG}@example.com"
    client.post(
        "/api/auth/register",
        json={"full_name": "Login User", "email": email, "password": "Secret123",
              "role": "patient"},
    )
    ok = client.post("/api/auth/login", json={"email": email, "password": "Secret123"})
    assert ok.status_code == 200
    assert ok.json()["access_token"]

    bad = client.post("/api/auth/login", json={"email": email, "password": "nope"})
    assert bad.status_code == 401


def test_protected_endpoint_requires_token():
    assert client.get("/api/auth/me").status_code == 401
    assert client.get("/api/documents").status_code == 401
    assert client.get("/api/admin/stats").status_code == 401


def test_role_guard_blocks_other_roles(patient_token):
    response = client.get("/api/admin/stats", headers=auth(patient_token))
    assert response.status_code == 403


def test_doctor_search():
    response = client.get("/api/doctors")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

    filtered = client.get("/api/doctors", params={"specialization": "Cardiology"})
    assert filtered.status_code == 200
    for doctor in filtered.json():
        assert "cardi" in doctor["specialization"].lower()


def test_document_upload_and_view(patient_token):
    content = "PYTEST REPORT\nHaemoglobin: 12.0 g/dL\n"
    response = client.post(
        "/api/documents/upload",
        headers=auth(patient_token),
        files={"file": ("pytest-report.txt", content.encode("utf-8"), "text/plain")},
        data={"document_type": "Lab Report"},
    )
    assert response.status_code == 201, response.text
    document_id = response.json()["id"]
    assert response.json()["extraction_status"] == "extracted"

    detail = client.get(f"/api/documents/{document_id}", headers=auth(patient_token))
    assert detail.status_code == 200
    assert "Haemoglobin" in detail.json()["extracted_text"]

    forbidden = client.get(f"/api/documents/{document_id}")
    assert forbidden.status_code == 401


def test_document_rejects_bad_extension(patient_token):
    response = client.post(
        "/api/documents/upload",
        headers=auth(patient_token),
        files={"file": ("bad.exe", b"MZ", "application/octet-stream")},
        data={"document_type": "other"},
    )
    assert response.status_code == 400


def test_appointment_creation_and_double_booking(patient_token):
    doctors = client.get("/api/doctors").json()
    assert doctors, "seed data must include doctors"

    slot = (datetime.now() + timedelta(days=90 + random.randint(0, 30))).replace(
        hour=14, minute=0, second=0, microsecond=0
    )
    payload = {
        "doctor_id": doctors[0]["id"],
        "appointment_date": slot.isoformat(),
        "appointment_time": "14:20",
        "consultation_mode": "in_person",
        "reason": "pytest appointment",
    }
    created = client.post("/api/appointments", headers=auth(patient_token), json=payload)
    assert created.status_code == 201, created.text

    duplicate = client.post("/api/appointments", headers=auth(patient_token), json=payload)
    assert duplicate.status_code == 409

    listing = client.get("/api/appointments", headers=auth(patient_token))
    assert listing.status_code == 200
    assert any(item["id"] == created.json()["id"] for item in listing.json())


def test_ai_service_health_is_reported(patient_token):
    response = client.post("/api/ai/chat", headers=auth(patient_token),
                           json={"message": "hello"})
    assert response.status_code in (200, 503)
    if response.status_code == 503:
        assert "detail" in response.json()
