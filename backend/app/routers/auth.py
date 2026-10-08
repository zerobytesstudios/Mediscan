"""Registration, login and current-user endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models import Doctor, Hospital, Patient, User, UserRole
from app.schemas.auth import LoginIn, RegisterIn, TokenOut, UserOut
from app.services.audit import audit
from app.utils.security import create_access_token, hash_password, verify_password
from app.utils.serialize import serialize_user

router = APIRouter(prefix="/api/auth", tags=["Auth"])

PUBLIC_ROLES = {"patient", "doctor", "hospital"}


@router.post(
    "/register",
    response_model=TokenOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new account (patient, doctor or hospital)",
)
def register(payload: RegisterIn, db: Session = Depends(get_db)):
    role_value = payload.role.lower()
    if role_value not in PUBLIC_ROLES:
        raise HTTPException(status_code=400, detail="Public registration is not allowed for this role.")

    existing = db.execute(select(User).where(User.email == payload.email.lower())).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    user = User(
        full_name=payload.full_name.strip(),
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        phone=payload.phone,
        role=UserRole(role_value),
        is_active=True,
    )
    db.add(user)
    db.flush()

    if role_value == "patient":
        db.add(Patient(user_id=user.id))
    elif role_value == "doctor":
        db.add(Doctor(user_id=user.id, is_verified=False, experience=0, consultation_fee=0.0))
    else:
        db.add(Hospital(user_id=user.id, name=payload.full_name.strip()))

    audit(db, user.id, "register", "users", user.id)
    db.commit()
    db.refresh(user)

    token = create_access_token(str(user.id), user.role.value)
    return {"access_token": token, "token_type": "bearer", "user": serialize_user(user)}


@router.post("/login", response_model=TokenOut, summary="Exchange credentials for a JWT")
def login(payload: LoginIn, db: Session = Depends(get_db)):
    user = db.execute(select(User).where(User.email == payload.email.lower())).scalar_one_or_none()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="This account has been deactivated.")

    audit(db, user.id, "login", "users", user.id)
    db.commit()

    token = create_access_token(str(user.id), user.role.value)
    return {"access_token": token, "token_type": "bearer", "user": serialize_user(user)}


@router.get("/me", response_model=UserOut, summary="Return the authenticated user")
def me(user: User = Depends(get_current_user)):
    return serialize_user(user)
