from fastapi import APIRouter, HTTPException, status, Depends
from auth import verify_password, create_access_token, get_current_user
from schemas.auth import LoginRequest, TokenResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest):
    if not verify_password(body.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid password",
        )
    token = create_access_token({"sub": "medvault"})
    return TokenResponse(access_token=token)


@router.post("/logout")
def logout():
    # Stateless — client discards the token
    return {"detail": "Logged out"}


@router.get("/verify")
def verify(current_user: dict = Depends(get_current_user)):
    return {"valid": True}
