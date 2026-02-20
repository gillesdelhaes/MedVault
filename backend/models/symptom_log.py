import uuid
from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import DateTime
from database import Base
from encryption import EncryptedString


class SymptomLog(Base):
    __tablename__ = "symptom_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    logged_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False)
    severity: Mapped[int] = mapped_column(Integer, nullable=False)  # 1-5
    description: Mapped[str | None] = mapped_column(EncryptedString, nullable=True)
    resolved_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[str | None] = mapped_column(EncryptedString, nullable=True)

    patient: Mapped["Patient"] = relationship("Patient", back_populates="symptom_logs")
