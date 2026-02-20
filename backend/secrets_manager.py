"""
Secrets manager — generates and persists application secrets on first run.

On the very first startup, this module:
  1. Creates /app/data/ (mapped to a Docker named volume)
  2. Generates a Fernet encryption key and a JWT signing secret
  3. Saves them to /app/data/secrets.json (mode 0600)
  4. Leaves app_password_hash as null → triggers the setup wizard in the browser

Subsequent startups just read the existing file. No .env file required.
"""

import json
import os
import secrets
import sys
from pathlib import Path

from cryptography.fernet import Fernet

# Allow override for local development outside Docker
_SECRETS_FILE = Path(os.environ.get("SECRETS_FILE", "/app/data/secrets.json"))

_state: dict = {}


def _load() -> None:
    global _state
    if _SECRETS_FILE.exists():
        try:
            with open(_SECRETS_FILE) as f:
                _state = json.load(f)
            return
        except Exception as e:
            print(f"WARNING: Could not read secrets file ({e}), regenerating.", file=sys.stderr)

    # First run — generate everything except the password
    _SECRETS_FILE.parent.mkdir(parents=True, exist_ok=True)
    _state = {
        "jwt_secret_key": secrets.token_hex(32),
        "encryption_key": Fernet.generate_key().decode(),
        "app_password_hash": None,  # Set when user completes the setup wizard
    }
    _persist()
    print("INFO: First run — secrets generated and saved to", _SECRETS_FILE, file=sys.stderr)


def _persist() -> None:
    with open(_SECRETS_FILE, "w") as f:
        json.dump(_state, f, indent=2)
    try:
        os.chmod(_SECRETS_FILE, 0o600)
    except OSError:
        pass  # Windows / some filesystems don't support chmod


def is_configured() -> bool:
    """True once the user has completed the setup wizard and set a password."""
    return bool(_state.get("app_password_hash"))


def get_jwt_key() -> str:
    return _state["jwt_secret_key"]


def get_encryption_key() -> str:
    return _state["encryption_key"]


def get_password_hash() -> str | None:
    return _state.get("app_password_hash")


def save_password_hash(hashed: str) -> None:
    """Called once during setup to store the bcrypt-hashed password."""
    _state["app_password_hash"] = hashed
    _persist()


# Run at import time so all other modules can call get_*() immediately
_load()
