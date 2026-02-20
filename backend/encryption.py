"""
Application-level field encryption using Fernet symmetric encryption.

Encrypted fields store Fernet ciphertext (base64-encoded, prefixed with 'gAAAAA').
This means SQL LIKE queries on encrypted fields are not possible — search is
performed by fetching candidates and filtering in Python after auto-decryption.

Key rotation: decrypt all records with old key, re-encrypt with new key.
See README for the key rotation procedure.
"""

from cryptography.fernet import Fernet, InvalidToken
from sqlalchemy import String
from sqlalchemy.types import TypeDecorator
import secrets_manager


def _init_fernet() -> Fernet:
    # secrets_manager already ran _load() at import time, so the key exists
    return Fernet(secrets_manager.get_encryption_key().encode())


_fernet = _init_fernet()


def encrypt(value: str) -> str:
    return _fernet.encrypt(value.encode()).decode()


def decrypt(value: str) -> str:
    try:
        return _fernet.decrypt(value.encode()).decode()
    except InvalidToken:
        # Return a placeholder rather than crashing; log the issue
        return "[decryption error]"


class EncryptedString(TypeDecorator):
    """SQLAlchemy column type that transparently encrypts/decrypts on read/write."""

    impl = String
    cache_ok = True

    def process_bind_param(self, value, dialect):
        """Encrypt value before writing to DB."""
        if value is None:
            return None
        return encrypt(str(value))

    def process_result_value(self, value, dialect):
        """Decrypt value after reading from DB."""
        if value is None:
            return None
        return decrypt(value)
