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
git clone https://github.com/gillesdelhaes/MedVault.git
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

## Security Notes

- The app is intended for **local/home network use** — it has no rate limiting, IP allowlisting, or brute-force protection on the login endpoint
- Do **not** expose port 8000 directly to the internet without adding a reverse proxy (e.g. nginx) with HTTPS and IP restrictions
- The PostgreSQL port is **not** exposed to the host — it is only reachable within the Docker internal network by the `app` container. The database credential is an internal implementation detail; the real security boundary is the app's JWT auth layer
- The auto-generated encryption key and JWT secret live in `app_data:/app/data/secrets.json` (mode 0600). They are **not** accessible over the network. Anyone with `docker exec` or root access on the host machine can read the file — treat host access accordingly
- Back up both Docker volumes (`postgres_data` and `app_data`) regularly. Losing `app_data` means losing the encryption key and access to all encrypted fields

## Stopping / Starting

```bash
docker-compose down      # stop containers (data preserved in volume)
docker-compose up -d     # restart
docker-compose down -v   # DANGER: deletes all data
```
