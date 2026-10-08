from datetime import datetime

from pydantic import BaseModel


class ConversationCreate(BaseModel):
    other_user_id: int


class MessageCreate(BaseModel):
    content: str


class ChatMessageOut(BaseModel):
    id: int
    conversation_id: int
    sender_id: int
    content: str
    created_at: datetime
    read_at: datetime | None = None


class ConversationOut(BaseModel):
    id: int
    other_user_id: int
    other_name: str
    other_role: str
    other_detail: str | None = None
    last_message: str | None = None
    last_message_at: datetime | None = None
    unread_count: int = 0
    updated_at: datetime


class ConversationDetailOut(ConversationOut):
    pass