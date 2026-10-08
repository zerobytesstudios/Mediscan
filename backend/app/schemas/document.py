from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: int
    filename: str
    file_type: str
    file_size: int
    document_type: str | None = None
    extraction_status: str = "pending"
    ai_summary: str | None = None
    created_at: datetime


class DocumentDetailOut(DocumentOut):
    extracted_text: str | None = None


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatAttachment(BaseModel):
    filename: str = "attachment"
    content_type: str = "application/octet-stream"
    data_base64: str = ""


class ChatIn(BaseModel):
    message: str = ""
    history: list[ChatMessage] = []
    attachment: ChatAttachment | None = None


class ChatOut(BaseModel):
    reply: str
