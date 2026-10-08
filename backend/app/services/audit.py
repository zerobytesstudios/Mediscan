"""Lightweight notification + audit-log helpers."""
from sqlalchemy.orm import Session

from app.models import AuditLog, Notification


def notify(db: Session, user_id: int, title: str, message: str) -> Notification:
    notification = Notification(user_id=user_id, title=title, message=message)
    db.add(notification)
    return notification


def audit(
    db: Session,
    user_id: int | None,
    action: str,
    resource: str | None = None,
    resource_id: str | int | None = None,
) -> AuditLog:
    entry = AuditLog(
        user_id=user_id,
        action=action,
        resource=resource,
        resource_id=str(resource_id) if resource_id is not None else None,
    )
    db.add(entry)
    return entry
