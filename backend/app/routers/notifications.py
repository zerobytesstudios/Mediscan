"""Basic notification endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models import Notification, User
from app.schemas.notification import NotificationOut

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


@router.get("", response_model=list[NotificationOut], summary="List my notifications")
def list_notifications(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    unread_only: bool = False,
):
    query = select(Notification).where(Notification.user_id == user.id)
    if unread_only:
        query = query.where(Notification.is_read.is_(False))
    query = query.order_by(Notification.created_at.desc()).limit(100)
    return list(db.execute(query).scalars().all())


@router.put(
    "/{notification_id}/read",
    response_model=NotificationOut,
    summary="Mark a notification as read",
)
def mark_read(
    notification_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notification = db.get(Notification, notification_id)
    if notification is None or notification.user_id != user.id:
        raise HTTPException(status_code=404, detail="Notification not found")
    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return notification


@router.put("/read-all", status_code=status.HTTP_204_NO_CONTENT, summary="Mark all as read")
def mark_all_read(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    notifications = (
        db.execute(
            select(Notification).where(
                Notification.user_id == user.id, Notification.is_read.is_(False)
            )
        )
        .scalars()
        .all()
    )
    for notification in notifications:
        notification.is_read = True
    db.commit()
    return None
