"""End-to-end smoke test of the Mediscan AI API."""
import sys
import uuid
from datetime import datetime, timedelta

import httpx

BASE = "http://127.0.0.1:8000/api"
results = []


def check(name, condition, info=""):
    results.append((name, bool(condition), info))
    print(f"{'PASS' if condition else 'FAIL'}  {name} {info}")


def main():
    client = httpx.Client(base_url=BASE, timeout=60)
    tag = uuid.uuid4().hex[:6]

    r = client.get("/health")
    check("health", r.status_code == 200 and r.json()["status"] == "ok", str(r.status_code))

    # registration
    email = f"e2e.patient.{tag}@example.com"
    r = client.post("/auth/register", json={
        "full_name": "E2E Patient",
        "email": email,
        "password": "Secret123",
        "phone": "+91-9999999999",
        "role": "patient",
    })
    check("register patient", r.status_code == 201, f"-> {r.status_code} {r.text[:200]}")
    if r.status_code != 201:
        return 1
    token = r.json()["access_token"]
    hdr = {"Authorization": f"Bearer {token}"}

    # admin registration blocked
    r = client.post("/auth/register", json={
        "full_name": "Hacker", "email": f"h.{tag}@example.com",
        "password": "Secret123", "role": "admin"})
    check("admin register blocked", r.status_code in (400, 422), f"-> {r.status_code}")

    # login
    r = client.post("/auth/login", json={"email": email, "password": "Secret123"})
    check("login", r.status_code == 200, f"-> {r.status_code}")
    r = client.post("/auth/login", json={"email": email, "password": "wrong"})
    check("bad login rejected", r.status_code == 401, f"-> {r.status_code}")

    # me
    r = client.get("/auth/me", headers=hdr)
    check("me", r.status_code == 200 and r.json()["role"] == "patient", f"-> {r.status_code}")
    r = client.get("/auth/me")
    check("me unauthenticated 401", r.status_code == 401, f"-> {r.status_code}")

    # patient profile
    r = client.put("/patients/me", headers=hdr, json={
        "gender": "female", "blood_group": "A+", "address": "E2E street",
        "allergies": "penicillin"})
    check("update patient profile", r.status_code == 200, f"-> {r.status_code} {r.text[:150]}")
    r = client.get("/patients/me", headers=hdr)
    check("get patient profile", r.status_code == 200 and r.json()["blood_group"] == "A+",
          f"-> {r.status_code}")

    # doctors
    r = client.get("/doctors")
    check("doctor list", r.status_code == 200 and len(r.json()) >= 5,
          f"-> {r.status_code} n={len(r.json()) if r.status_code==200 else '?'}")
    r = client.get("/doctors", params={"q": "Cardiology"})
    check("doctor search q", r.status_code == 200 and len(r.json()) >= 1, f"-> n={len(r.json())}")
    r = client.get("/doctors", params={"specialization": "Orthopaedics"})
    check("doctor specialization filter", r.status_code == 200 and len(r.json()) == 1,
          f"-> n={len(r.json())}")
    doctor_id = client.get("/doctors").json()[0]["id"]
    r = client.get(f"/doctors/{doctor_id}")
    check("doctor detail", r.status_code == 200, f"-> {r.status_code}")
    r = client.get("/doctors/999999")
    check("doctor 404", r.status_code == 404, f"-> {r.status_code}")

    # document upload
    content = ("E2E DEMO REPORT\nHaemoglobin: 11.2 g/dL\nWBC: 7.1 x10^9/L\n"
               "Reference ranges vary by laboratory.\n")
    r = client.post("/documents/upload", headers=hdr,
                    files={"file": ("e2e-report.txt", content.encode(), "text/plain")},
                    data={"document_type": "Lab Report"})
    check("document upload", r.status_code == 201, f"-> {r.status_code} {r.text[:200]}")
    if r.status_code != 201:
        return 1
    doc_id = r.json()["id"]
    check("text extracted", r.json()["extraction_status"] == "extracted",
          f"-> {r.json()['extraction_status']}")

    # invalid file
    r = client.post("/documents/upload", headers=hdr,
                    files={"file": ("evil.exe", b"MZ", "application/octet-stream")},
                    data={"document_type": "other"})
    check("invalid file rejected", r.status_code == 400, f"-> {r.status_code}")

    # oversized file (11 MB)
    r = client.post("/documents/upload", headers=hdr,
                    files={"file": ("big.txt", b"a" * (11 * 1024 * 1024), "text/plain")},
                    data={"document_type": "other"})
    check("oversize rejected", r.status_code == 413, f"-> {r.status_code}")

    r = client.get(f"/documents/{doc_id}", headers=hdr)
    check("document detail", r.status_code == 200, f"-> {r.status_code}")
    r = client.get(f"/documents/{doc_id}/download", headers=hdr)
    check("document download", r.status_code == 200, f"-> {r.status_code}")
    r = client.get(f"/documents/{doc_id}/download")
    check("download auth required", r.status_code == 401, f"-> {r.status_code}")

    r = client.get("/documents", headers=hdr)
    check("document list", r.status_code == 200 and len(r.json()) >= 1, f"-> n={len(r.json())}")

    # AI analyze
    r = client.post(f"/ai/analyze-document/{doc_id}", headers=hdr, timeout=120)
    check("AI analyze", r.status_code == 200, f"-> {r.status_code} {r.text[:300]}")
    if r.status_code == 200:
        summary = r.json()["ai_summary"] or ""
        check("AI summary has disclaimer",
              "educational purposes only" in summary.lower(), f"len={len(summary)}")

    # AI chat
    r = client.post("/ai/chat", headers=hdr, json={"message": "What does high creatinine mean?"})
    check("AI chat", r.status_code == 200 and len(r.json()["reply"]) > 50,
          f"-> {r.status_code} {r.text[:200]}")

    # appointments
    slot_date = (datetime.now() + timedelta(days=45)).replace(hour=10, minute=0, second=0,
                                                              microsecond=0)
    slot_time = f"{10 + (datetime.now().second % 6):02d}:{(datetime.now().second * 7) % 60:02d}"
    r = client.post("/appointments", headers=hdr, json={
        "doctor_id": doctor_id,
        "appointment_date": slot_date.isoformat(),
        "appointment_time": slot_time,
        "consultation_mode": "in_person",
        "reason": "E2E checkup",
    })
    check("book appointment", r.status_code == 201, f"-> {r.status_code} {r.text[:250]}")
    appt_id = r.json()["id"] if r.status_code == 201 else None

    r = client.post("/appointments", headers=hdr, json={
        "doctor_id": doctor_id,
        "appointment_date": slot_date.isoformat(),
        "appointment_time": slot_time,
        "consultation_mode": "online",
        "reason": "double book",
    })
    check("double booking blocked", r.status_code == 409, f"-> {r.status_code}")

    r = client.get("/appointments", headers=hdr)
    check("list appointments", r.status_code == 200 and len(r.json()) >= 1, f"-> n={len(r.json())}")
    r = client.get(f"/appointments/{appt_id}", headers=hdr, params={"detail": True})
    check("appointment detail", r.status_code == 200 and "doctor" in r.json(),
          f"-> {r.status_code}")

    # notifications
    r = client.get("/notifications", headers=hdr)
    check("notifications", r.status_code == 200, f"-> n={len(r.json())}")
    if r.json():
        nid = r.json()[0]["id"]
        r = client.put(f"/notifications/{nid}/read", headers=hdr)
        check("mark read", r.status_code == 200 and r.json()["is_read"], f"-> {r.status_code}")

    # dashboard stats
    r = client.get("/dashboard/stats", headers=hdr)
    check("patient dashboard stats", r.status_code == 200 and r.json()["documents"] >= 1,
          f"-> {r.text[:200]}")

    # medical records (patient view)
    r = client.get("/medical-records", headers=hdr)
    check("patient medical records", r.status_code == 200, f"-> n={len(r.json())}")
    r = client.post("/medical-records", headers=hdr, json={
        "patient_id": 1, "title": "not allowed"})
    check("patient cannot create record", r.status_code == 403, f"-> {r.status_code}")

    # doctor login flow
    r = client.post("/auth/login", json={"email": "doctor1.demo@mediscan.local",
                                         "password": "Demo@123"})
    check("doctor login", r.status_code == 200, f"-> {r.status_code}")
    dhdr = {"Authorization": f"Bearer {r.json()['access_token']}"}
    r = client.get("/dashboard/stats", headers=dhdr)
    check("doctor dashboard stats", r.status_code == 200, f"-> {r.text[:250]}")
    r = client.get("/appointments", headers=dhdr)
    check("doctor appointments", r.status_code == 200, f"-> n={len(r.json())}")

    # hospital login
    r = client.post("/auth/login", json={"email": "hospital.demo@mediscan.local",
                                         "password": "Demo@123"})
    check("hospital login", r.status_code == 200, f"-> {r.status_code}")
    hhdr = {"Authorization": f"Bearer {r.json()['access_token']}"}
    r = client.get("/dashboard/stats", headers=hhdr)
    check("hospital dashboard stats", r.status_code == 200 and r.json()["doctors"] >= 5,
          f"-> {r.text[:200]}")

    # admin
    r = client.post("/auth/login", json={"email": "admin@mediscan.local", "password": "Admin@123"})
    check("admin login", r.status_code == 200, f"-> {r.status_code}")
    ahdr = {"Authorization": f"Bearer {r.json()['access_token']}"}
    r = client.get("/admin/stats", headers=ahdr)
    check("admin stats", r.status_code == 200 and r.json()["total_users"] >= 10,
          f"-> {r.text[:250]}")
    r = client.get("/admin/users", headers=ahdr)
    check("admin users", r.status_code == 200 and len(r.json()) >= 10, f"-> n={len(r.json())}")
    r = client.get("/admin/doctors", headers=ahdr)
    check("admin doctors", r.status_code == 200 and len(r.json()) >= 5, f"-> n={len(r.json())}")
    r = client.get("/admin/hospitals", headers=ahdr)
    check("admin hospitals", r.status_code == 200 and len(r.json()) >= 1, f"-> n={len(r.json())}")
    r = client.get("/admin/appointments", headers=ahdr)
    check("admin appointments", r.status_code == 200, f"-> n={len(r.json())}")

    # role protection
    r = client.get("/admin/stats", headers=hdr)
    check("patient blocked from admin", r.status_code == 403, f"-> {r.status_code}")

    # consult notes: book a fresh appointment with doctor2 so the run is repeatable
    doc2_id = next(
        (d["id"] for d in client.get("/doctors").json()
         if d.get("email") == "doctor2.demo@mediscan.local"), None)
    consult_slot = (datetime.now() + timedelta(days=60)).replace(hour=12, minute=0, second=0,
                                                                 microsecond=0)
    consult_time = f"12:{(datetime.now().second * 9) % 60:02d}"
    book = client.post("/appointments", headers=hdr, json={
        "doctor_id": doc2_id,
        "appointment_date": consult_slot.isoformat(),
        "appointment_time": consult_time,
        "consultation_mode": "online",
        "reason": "Consultation note flow",
    })
    target_id = book.json()["id"] if book.status_code == 201 else None

    r = client.post("/auth/login", json={"email": "doctor2.demo@mediscan.local",
                                         "password": "Demo@123"})
    d2 = {"Authorization": f"Bearer {r.json()['access_token']}"}
    created_consultation = None
    if target_id:
        r = client.post("/consultations", headers=d2, json={
            "appointment_id": target_id,
            "notes": "Patient reviewed. Advised hydration and follow up.",
            "create_medical_record": True,
            "record_title": "E2E consultation"})
        if r.status_code == 201:
            created_consultation = target_id
    appts = client.get("/appointments", headers=d2).json()
    if created_consultation is None:
        for appt in appts:
            r = client.post("/consultations", headers=d2, json={
                "appointment_id": appt["id"],
                "notes": "Patient reviewed. Advised hydration and follow up.",
                "create_medical_record": True,
                "record_title": "E2E consultation"})
            if r.status_code == 201:
                created_consultation = appt["id"]
                break
    check("create consultation", created_consultation is not None,
          f"-> {r.status_code} {r.text[:250]}")
    if created_consultation:
        r = client.put(f"/appointments/{created_consultation}/status", headers=d2,
                       json={"status": "completed"})
        check("doctor completes appointment", r.status_code == 200,
              f"-> {r.status_code} {r.text[:200]}")
        r = client.post("/consultations", headers=d2, json={
            "appointment_id": created_consultation, "notes": "duplicate"})
        check("duplicate consultation blocked", r.status_code == 409, f"-> {r.status_code}")
        r = client.get("/consultations", headers=d2)
        check("list consultations", r.status_code == 200 and len(r.json()) >= 1,
              f"-> n={len(r.json())}")
    else:
        check("doctor completes appointment", False, "no consultation created")

    # delete document
    r = client.delete(f"/documents/{doc_id}", headers=hdr)
    check("delete document", r.status_code == 204, f"-> {r.status_code}")
    r = client.get(f"/documents/{doc_id}", headers=hdr)
    check("deleted doc 404", r.status_code == 404, f"-> {r.status_code}")

    failed = [x for x in results if not x[1]]
    print("\n" + "=" * 50)
    print(f"{len(results) - len(failed)}/{len(results)} checks passed")
    if failed:
        print("FAILED:")
        for name, _, info in failed:
            print(f"  - {name} {info}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
