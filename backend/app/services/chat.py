"""Shared chat logic used by both the REST router and the WebSocket endpoint."""
from datetime import datetime

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Appointment, Conversation, Doctor, Message, Patient, User, UserRole
from app.schemas.conversation import ChatMessageOut, ConversationOut
from app.services.audit import audit


def _profile_pair(db: Session, user: User, other: User) -> tuple[Patient, Doctor]:
    """Return (patient, doctor) for a patient/doctor pair, validating roles.

    Raises 400 for wrong role combinations and 403 when the two users have
    no appointment-based relationship.
    """
    if user.role == UserRole.PATIENT and other.role == UserRole.DOCTOR:
        patient = db.execute(select(Patient).where(Patient.user_id == user.id)).scalar_one_or_none()
        doctor = db.execute(select(Doctor).where(Doctor.user_id == other.id)).scalar_one_or_none()
    elif user.role == UserRole.DOCTOR and other.role == UserRole.PATIENT:
        doctor = db.execute(select(Doctor).where(Doctor.user_id == user.id)).scalar_one_or_none()
        patient = db.execute(select(Patient).where(Patient.user_id == other.id)).scalar_one_or_none()
    else:
        raise HTTPException(
            status_code=400, detail="Conversations are available between patients and doctors."
        )

    if patient is None or doctor is None:
        raise HTTPException(status_code=400, detail="Both parties need complete profiles.")

    linked = db.execute(
        select(Appointment.id).where(
            Appointment.patient_id == patient.id,
            Appointment.doctor_id == doctor.id,
        )
    ).first()
    if linked is None:
        raise HTTPException(
            status_code=403,
            detail="You can only message a doctor you share an appointment with.",
        )
    return patient, doctor


def get_or_create_conversation(db: Session, user: User, other_user_id: int) -> Conversation:
    if other_user_id == user.id:
        raise HTTPException(status_code=400, detail="You cannot chat with yourself.")
    other = db.get(User, other_user_id)
    if other is None or not other.is_active:
        raise HTTPException(status_code=404, detail="User not found")

    _profile_pair(db, user, other)

    doctor_user_id = other.id if other.role == UserRole.DOCTOR else user.id
    patient_user_id = user.id if other.role == UserRole.DOCTOR else other.id

    conversation = db.execute(
        select(Conversation).where(
            Conversation.doctor_user_id == doctor_user_id,
            Conversation.patient_user_id == patient_user_id,
        )
    ).scalar_one_or_none()
    if conversation is None:
        conversation = Conversation(
            doctor_user_id=doctor_user_id, patient_user_id=patient_user_id
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
    return conversation


def get_conversation_for_user(
    db: Session, conversation_id: int, user: User
) -> Conversation:
    conversation = db.get(Conversation, conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if user.id not in (conversation.doctor_user_id, conversation.patient_user_id):
        raise HTTPException(status_code=403, detail="You do not have access to this conversation")
    return conversation


def add_message(
    db: Session, conversation: Conversation, sender: User, content: str
) -> Message:
    text = (content or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")
    if len(text) > 4000:
        raise HTTPException(status_code=400, detail="Message is too long (max 4000 characters).")

    conversation.updated_at = datetime.now()
    message = Message(conversation_id=conversation.id, sender_id=sender.id, content=text)
    db.add(message)
    audit(db, sender.id, "chat_message", "conversations", conversation.id)
    db.commit()
    db.refresh(message)
    return message


def list_conversations(db: Session, user: User) -> list[ConversationOut]:
    rows = db.execute(
        select(Conversation).where(
            (Conversation.doctor_user_id == user.id) | (Conversation.patient_user_id == user.id)
        )
    ).scalars().all()

    results = []
    for conversation in rows:
        other_id = (
            conversation.patient_user_id
            if user.id == conversation.doctor_user_id
            else conversation.doctor_user_id
        )
        other = db.get(User, other_id)

        last = db.execute(
            select(Message)
            .where(Message.conversation_id == conversation.id)
            .order_by(Message.id.desc())
            .limit(1)
        ).scalar_one_or_none()

        unread = db.execute(
            select(func.count(Message.id)).where(
                Message.conversation_id == conversation.id,
                Message.sender_id != user.id,
                Message.read_at.is_(None),
            )
        ).scalar_one()

        detail = None
        if other and other.role == UserRole.DOCTOR:
            doctor = db.execute(select(Doctor).where(Doctor.user_id == other.id)).scalar_one_or_none()
            detail = doctor.specialization if doctor else None

        results.append(
            ConversationOut(
                id=conversation.id,
                other_user_id=other_id,
                other_name=other.full_name if other else "Unknown",
                other_role=other.role.value if other else "",
                other_detail=detail,
                last_message=last.content if last else None,
                last_message_at=last.created_at if last else None,
                unread_count=unread,
                updated_at=conversation.updated_at,
            )
        )
    results.sort(key=lambda item: item.last_message_at or item.updated_at, reverse=True)
    return results


def to_message_out(message: Message) -> dict:
    return ChatMessageOut(
        id=message.id,
        conversation_id=message.conversation_id,
        sender_id=message.sender_id,
        content=message.content,
        created_at=message.created_at,
        read_at=message.read_at,
    ).model_dump(mode="json")


def other_participant_id(conversation: Conversation, user_id: int) -> int:
    if user_id == conversation.doctor_user_id:
        return conversation.patient_user_id
    return conversation.doctor_user_id