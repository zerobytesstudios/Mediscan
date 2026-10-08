import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _values(enum_cls):
    return [m.value for m in enum_cls]


class AppointmentStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ConsultationMode(str, enum.Enum):
    IN_PERSON = "in_person"
    ONLINE = "online"


class Appointment(Base):
    __tablename__ = "appointments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    patient_id: Mapped[int] = mapped_column(
        ForeignKey("patients.id", ondelete="CASCADE"), index=True
    )
    doctor_id: Mapped[int] = mapped_column(
        ForeignKey("doctors.id", ondelete="CASCADE"), index=True
    )
    appointment_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    appointment_time: Mapped[str] = mapped_column(String(10), nullable=False)
    consultation_mode: Mapped[ConsultationMode] = mapped_column(
        Enum(ConsultationMode, name="consultation_mode", values_callable=_values),
        default=ConsultationMode.IN_PERSON,
    )
    status: Mapped[AppointmentStatus] = mapped_column(
        Enum(AppointmentStatus, name="appointment_status", values_callable=_values),
        default=AppointmentStatus.PENDING,
    )
    reason: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    patient = relationship("Patient")
    doctor = relationship("Doctor")
    consultation = relationship("Consultation", back_populates="appointment", uselist=False)
