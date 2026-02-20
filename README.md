# MedVault

A self-hosted, privacy-first personal medical tracking web app for family use.

## Features

- **Calendar view** — month and week views showing appointments, symptoms, and active medications
- **Patient profiles** — multiple patients (family members) with color-coding
- **Appointments** — log visits with provider, location, reason, follow-up flag
- **Symptom logs** — track symptoms with severity 1–5, description, and resolution date
- **Medications** — manage courses and ongoing meds; log individual doses
- **Search** — full-text search across all records (post-decryption, in-memory)
- **App-layer encryption** — sensitive free-text fields are Fernet-encrypted in the database

## Quick Start

No configuration file needed — MedVault is zero-config out of the box.

### 1. Build and start

```bash
git clone <repo>
cd MedVault
docker-compose up --build -d
```

Migrations run automatically on every startup before the server accepts connections.

### 2. Open the app and complete setup

```
http://localhost:8000
```

On first visit you'll see a **setup wizard** — just choose a password and you're in.

The JWT signing secret and Fernet encryption key are generated automatically on first start and saved to the `app_data` Docker volume (`/app/data/secrets.json`, mode 0600). You never need to touch them.

---

## Smoke Test

```bash
# Get a token
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"yourpass"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# List patients (should return [])
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/patients | python3 -m json.tool

# Verify encryption: create an appointment, then inspect raw DB
curl -s -X POST http://localhost:8000/api/appointments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"patient_id":"<uuid>","datetime":"2025-06-01T10:00:00","provider_name":"Dr. Smith","reason":"Annual checkup"}'

docker-compose exec db psql -U medvault -d medvault \
  -c "SELECT reason FROM appointments LIMIT 1;"
# → should show Fernet ciphertext starting with "gAAAAA", NOT "Annual checkup"
```

---

## API Reference

```
POST /api/auth/login             body: {password}               → {access_token}
POST /api/auth/logout                                           → {detail}
GET  /api/auth/verify                                           → {valid: true}

GET/POST        /api/patients
GET/PUT/DELETE  /api/patients/{id}

GET/POST        /api/appointments    ?patient_id=&from=&to=
GET/PUT/DELETE  /api/appointments/{id}

GET/POST        /api/symptoms        ?patient_id=&from=&to=
GET/PUT/DELETE  /api/symptoms/{id}

GET/POST        /api/medications     ?patient_id=
GET/PUT/DELETE  /api/medications/{id}
POST            /api/medications/{id}/doses    body: {taken_at, quantity, notes}
GET             /api/medications/{id}/doses

GET  /api/calendar   ?from=ISO&to=ISO&patient_id=
GET  /api/search     ?q=&type=&patient_id=&from=&to=
```

Interactive docs: `http://localhost:8000/docs`

---

## Encryption

All sensitive health narrative fields are encrypted with **Fernet** (symmetric AES-128-CBC + HMAC-SHA256) before being stored in PostgreSQL. The encryption key is auto-generated on first start and stored in the `app_data` Docker volume (`/app/data/secrets.json`, mode 0600).

**Encrypted fields:**
- `patients.notes`
- `appointments.location`, `.reason`, `.notes`
- `symptom_logs.description`, `.notes`
- `medications.schedule_notes`, `.notes`
- `medication_doses.notes`

**Plaintext fields (used in SQL queries or calendar titles):**
- Patient name, date of birth, color
- Appointment datetime, provider_name, follow_up_required
- Symptom severity, logged_at, resolved_at
- Medication name, dosage, frequency, dates, is_ongoing

**Search on encrypted fields** is performed by fetching candidates from the DB and filtering in Python after SQLAlchemy auto-decrypts. This is practical at family scale (hundreds to low thousands of records).

### Key Rotation

The encryption key is stored in `secrets.json` inside the `app_data` Docker volume. To rotate it:

```bash
# 1. Exec into the running container
docker-compose exec app sh

# 2. Generate a new Fernet key
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# 3. Edit /app/data/secrets.json and replace the value of "encryption_key" with the new key.
#    WARNING: After saving, any previously encrypted data will be unreadable until
#    you re-encrypt it with the new key. Back up your database first.

# 4. Restart the app to pick up the new key
docker-compose restart app
```

> **Important:** Back up the `postgres_data` and `app_data` volumes before rotating keys. The `[decryption error]` placeholder is returned (instead of crashing) if a value cannot be decrypted with the current key.

---

## Architecture

```
MedVault/
├── backend/           Python 3.12 + FastAPI + SQLAlchemy 2.0
│   ├── main.py        App factory, static file serving, router registration
│   ├── config.py      pydantic-settings (DB connection settings)
│   ├── database.py    SQLAlchemy engine + get_db() dependency
│   ├── auth.py        bcrypt password verify, JWT create/decode
│   ├── encryption.py  Fernet init, EncryptedString TypeDecorator
│   ├── models/        SQLAlchemy ORM models (5 tables)
│   ├── schemas/       Pydantic request/response models
│   ├── crud/          Database access functions
│   ├── routers/       FastAPI route handlers
│   └── alembic/       Database migrations
└── frontend/          Pure HTML/CSS/JS (no framework)
    ├── index.html     Single-page shell
    ├── css/           Design system (variables, base, components, calendar)
    └── js/            Hash-based SPA router + view modules
```

## Security Notes

- The app is intended for **local/home network use** — it has no rate limiting, IP allowlisting, or brute-force protection on the login endpoint
- Do **not** expose port 8000 directly to the internet without adding a reverse proxy (e.g. nginx) with HTTPS and IP restrictions
- The PostgreSQL port is **not** exposed to the host — it is only reachable from within the Docker internal network by the `app` container. The database credential is an internal implementation detail; the real security boundary is the app's JWT auth layer
- The auto-generated encryption key and JWT secret in the `app_data` volume must be kept safe; losing them means losing access to your encrypted data — back up both Docker volumes regularly

## Stopping / Starting

```bash
docker-compose down      # stop containers (data preserved in volume)
docker-compose up -d     # restart
docker-compose down -v   # DANGER: deletes all data
```
