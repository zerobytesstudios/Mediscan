"""Direct patient<->doctor conversations (REST)."""
from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models import Message, User
from app.schemas.conversation import (
    ChatMessageOut,
    ConversationCreate,
    ConversationDetailOut,
    ConversationOut,
    MessageCreate,
)
from app.services import chat as chat_service

router = APIRouter(prefix="/api/conversations", tags=["Conversations"])


@router.get("", response_model=list[ConversationOut], summary="List my conversations")
def list_conversations(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return chat_service.list_conversations(db, user)


@router.post(
    "", response_model=ConversationDetailOut, summary="Open (create or fetch) a conversation"
)
def open_conversation(
    payload: ConversationCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conversation = chat_service.get_or_create_conversation(db, user, payload.other_user_id)
    return _detail(db, user, conversation)


@router.get("/{conversation_id}", response_model=ConversationDetailOut, summary="Conversation detail")
def conversation_detail(
    conversation_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conversation = chat_service.get_conversation_for_user(db, conversation_id, user)
    return _detail(db, user, conversation)


@router.get(
    "/{conversation_id}/messages",
    response_model=list[ChatMessageOut],
    summary="List messages in a conversation",
)
def list_messages(
    conversation_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conversation = chat_service.get_conversation_for_user(db, conversation_id, user)
    messages = (
        db.execute(
            select(Message)
            .where(Message.conversation_id == conversation.id)
            .order_by(Message.id)
        )
        .scalars()
        .all()
    )
    _mark_read(db, conversation, user)
    return [chat_service.to_message_out(message) for message in messages]


@router.post(
    "/{conversation_id}/messages",
    response_model=ChatMessageOut,
    summary="Send a message (REST fallback)",
)
def send_message(
    conversation_id: int,
    payload: MessageCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conversation = chat_service.get_conversation_for_user(db, conversation_id, user)
    message = chat_service.add_message(db, conversation, user, payload.content)
    return chat_service.to_message_out(message)


@router.post("/{conversation_id}/read", summary="Mark conversation as read")
def mark_read(
    conversation_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conversation = chat_service.get_conversation_for_user(db, conversation_id, user)
    _mark_read(db, conversation, user)
    return {"unread_count": 0}


def _mark_read(db: Session, conversation, user: User) -> None:
    messages = (
        db.execute(
            select(Message).where(
                Message.conversation_id == conversation.id,
                Message.sender_id != user.id,
                Message.read_at.is_(None),
            )
        )
        .scalars()
        .all()
    )
    if messages:
        for message in messages:
            message.read_at = datetime.now()
        db.commit()


def _detail(db: Session, user: User, conversation) -> dict:
    items = chat_service.list_conversations(db, user)
    for item in items:
        if item.id == conversation.id:
            return item
    return ConversationDetailOut(
        id=conversation.id,
        other_user_id=0,
        other_name="",
        other_role="",
        updated_at=conversation.updated_at,
    )