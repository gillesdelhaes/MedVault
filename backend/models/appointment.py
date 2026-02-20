import uuid
from sqlalchemy import String, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import DateTime
from database import Base
from encryption import EncryptedString


class Appointment(Base):
    __tablename__ = "appointments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    datetime: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False)
    provider_name: Mapped[str] = mapped_column(String(255), nullable=False)
    location: Mapped[str | None] = mapped_column(EncryptedString, nullable=True)
    reason: Mapped[str | None] = mapped_column(EncryptedString, nullable=True)
    follow_up_required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    notes: Mapped[str | None] = mapped_column(EncryptedString, nullable=True)

    patient: Mapped["Patient"] = relationship("Patient", back_populates="appointments")
