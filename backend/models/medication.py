import uuid
from sqlalchemy import String, Integer, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import Date
from database import Base
from encryption import EncryptedString


class Medication(Base):
    __tablename__ = "medications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    dosage: Mapped[str] = mapped_column(String(100), nullable=False)
    frequency_per_day: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    start_date: Mapped[Date] = mapped_column(Date, nullable=False)
    end_date: Mapped[Date | None] = mapped_column(Date, nullable=True)
    is_ongoing: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    schedule_notes: Mapped[str | None] = mapped_column(EncryptedString, nullable=True)
    notes: Mapped[str | None] = mapped_column(EncryptedString, nullable=True)

    patient: Mapped["Patient"] = relationship("Patient", back_populates="medications")
    doses: Mapped[list["MedicationDose"]] = relationship(
        "MedicationDose", back_populates="medication", cascade="all, delete-orphan"
    )
