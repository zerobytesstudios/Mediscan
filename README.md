# MEDISCAN AI

A full-stack **Medical Information & Report Assistant** MVP. Patients upload medical
reports and get plain-language **AI explanations** (powered by Groq), chat with a
**health chatbot**, search and book **doctors**, and keep a **medical history**.
Doctors, hospitals and platform admins each get role-specific dashboards. Patients
and doctors can also **message each other and start secure video calls** (WebSocket
chat + WebRTC signaling) once they share an appointment.

![Stack](https://img.shields.io/badge/stack-React%20%2B%20FastAPI%20%2B%20PostgreSQL-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

- **Role-based accounts** — Patient, Doctor, Hospital, Admin (JWT auth, bcrypt hashing)
- **AI report explanations** — upload a PDF/TXT/image report, get a structured
  plain-language summary from a Groq LLM (with a medical disclaimer)
- **Health chatbot** — ask medical education questions from any role; attach a **JPG/PNG/PDF/TXT** file and the AI reads it (images via model vision, PDF/TXT via text extraction)
- **Documents** — upload, list, download, delete (≤10 MB; .pdf/.txt/.jpg/.jpeg/.png)
- **Doctor search** — filter by specialization, location, verified/experience, min rating
- **Appointments** — book (with conflict detection), confirm/cancel/complete, notifications
- **Doctor-patient messaging & video calls** — a patient and a doctor who share an
  appointment can exchange real-time chat messages (WebSocket `/api/ws/chat`) with
  typing indicators and unread badges, start a WebRTC video call from a profile or
  patient card, accept/decline/end calls, and mute / turn the camera off
- **Medical records & consultations** — doctors create records/notes, patients see history
- **Dashboards** — per-role stats: patient, doctor, hospital, and platform admin (charts)
- **Notifications** — bell with unread-count badge in the app shell

## Tech stack

| Layer      | Tech                                                        |
| ---------- | ----------------------------------------------------------- |
| Frontend   | React 18, Vite 6, Tailwind CSS 3, React Router 6, Recharts  |
| Backend    | FastAPI, SQLAlchemy 2, Pydantic v2, PyJWT, bcrypt, uvicorn  |
| Database   | PostgreSQL                                                 |
| AI         | Groq API (`qwen/qwen3.8-27b`)                              |
| Testing    | pytest (backend: 11 tests, 51 E2E checks), puppeteer-core (frontend smoke: 36 checks) |

## Project layout

```
backend/
  app/            FastAPI application (routers, models, schemas, services, deps, ws)
  tests/          pytest suite + E2E test client
  uploads/        stored report files (kept out of git)
  seed.py         demo data (users, doctors, documents, appointments…)
  run.py          entry point (uvicorn)
  .env / .env.example
frontend/
  src/            React app (pages, components, services, context, hooks)
  smoke.mjs       headless-browser smoke test (36 checks incl. chat + video call)
  .env / .env.example
```

## Prerequisites (Windows)

1. **Python 3.11+** installed and on PATH
2. **Node.js 20+** (npm) installed
3. **PostgreSQL 18** running as the `postgresql-x64-18` service

## Backend setup

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Create `backend/.env` (copy from `.env.example`) and fill in:

```ini
DATABASE_URL=postgresql+psycopg2://postgres:YOUR_PASSWORD@localhost:5432/mediscan_ai
GROQ_API_KEY=your_groq_key
GROQ_MODEL=qwen/qwen3.8-27b
```

> Groq model IDs change over time; `GROQ_MODEL` is configurable if your key
> rejects the packaged default.

Initialize the database and load demo data:

```powershell
python -m app.db.init_db     # or: uvicorn does this automatically on startup
python seed.py
```

Run the API (starts PostgreSQL schema automatically):

```powershell
python run.py                # http://localhost:8080
python -m uvicorn app.main:app --reload
```

Health check: `http://localhost:8080/api/health`

### Run backend tests

Start the API in one terminal, then:

```powershell
pytest tests                 # unit/integration suite (uses a TEST database)
```

## Frontend setup

```powershell
cd frontend
npm install
```

`frontend/.env` (see `.env.example`) — already contains the default:

```ini
VITE_API_URL=http://localhost:8080/api
```

Run the dev server:

```powershell
npm run dev                  # http://localhost:5178
```

Build and preview:

```powershell
npm run build
npm run preview
```

### Frontend smoke test (optional)

Requires both servers running:

```powershell
npm run build && node smoke.mjs
```

## Demo accounts

Created by `python seed.py`:

| Role     | Email                      | Password |
| -------- | -------------------------- | -------- |
| Admin    | admin@mediscan.local       | Admin@123 |
| Doctor   | doctor1.demo@mediscan.local | Demo@123 |
| Patient  | patient1.demo@mediscan.local | Demo@123 |
| Hospital | hospital.demo@mediscan.local | Demo@123 |

## API overview

`/api/auth`, `/api/patients`, `/api/doctors`, `/api/hospitals`, `/api/documents`,
`/api/ai` (analyze + chat), `/api/appointments`, `/api/medical-records`,
`/api/consultations`, `/api/conversations` (list/open/messages/read),
`/api/notifications`, `/api/dashboard`, `/api/admin`, plus the WebSocket endpoint
`/api/ws/chat?token=` for live messages, typing and WebRTC call signaling.
Interactive docs at `http://localhost:8080/docs`.

## Troubleshooting

- **CORS / connection refused** — confirm the backend is running on port 8080 and
  `VITE_API_URL` matches.
- **Groq 404 model** — update `GROQ_MODEL` in `backend/.env`, then restart uvicorn
  (`run.py` does not auto-reload; use `--reload` during development).
- **`email-validator` rejects `.local` emails** — the project deliberately uses a
  relaxed email validator (`app/schemas/base.py`) so the demo logins work.
- **Video call shows "connecting" forever on a fresh machine** — the browser needs
  camera/microphone permission; calls use Google's public STUN server. Headless
  testing uses Chrome's `--use-fake-ui-for-media-stream --use-fake-device-for-media-stream`.
- **Conversation blocked (403)** — chat is only allowed between a patient and a
  doctor who share at least one appointment.

## Roadmap (out of scope for this MVP)

Telehealth video calls with screen-share/recording, online payments, RAG/vector
search over reports, Redis/celery background jobs, S3 file storage, microservices.