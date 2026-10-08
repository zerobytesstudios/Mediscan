"""Shared FastAPI dependencies: current user and role guards."""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, UserRole
from app.utils.security import decode_access_token

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = decode_access_token(credentials.credentials)
        user_id = int(payload.get("sub"))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account not found or deactivated",
        )
    return user


class RoleChecker:
    """Reusable dependency enforcing one or more allowed roles."""

    def __init__(self, *roles: UserRole):
        self.roles = set(roles)

    def __call__(self, user: User = Depends(get_current_user)) -> User:
        if user.role not in self.roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action",
            )
        return user


require_patient = RoleChecker(UserRole.PATIENT)
require_doctor = RoleChecker(UserRole.DOCTOR)
require_hospital = RoleChecker(UserRole.HOSPITAL)
require_admin = RoleChecker(UserRole.ADMIN)
require_staff = RoleChecker(UserRole.DOCTOR, UserRole.HOSPITAL, UserRole.ADMIN)
require_any = RoleChecker(*UserRole)
