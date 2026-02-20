from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

import secrets_manager
from auth import hash_password, create_access_token
from schemas.auth import TokenResponse

router = APIRouter(prefix="/api/setup", tags=["setup"])


class SetupRequest(BaseModel):
    password: str = Field(..., min_length=8, description="Minimum 8 characters")


@router.get("/status")
def setup_status():
    """Returns whether the app has been configured yet."""
    return {"configured": secrets_manager.is_configured()}


@router.post("", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def complete_setup(body: SetupRequest):
    """
    One-time endpoint: set the application password.
    Returns a JWT so the user is immediately logged in after setup.
    Can only be called once — subsequent calls are rejected.
    """
    if secrets_manager.is_configured():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Setup already completed. Use /api/auth/login to sign in.",
        )
    hashed = hash_password(body.password)
    secrets_manager.save_password_hash(hashed)
    token = create_access_token({"sub": "medvault"})
    return TokenResponse(access_token=token)
