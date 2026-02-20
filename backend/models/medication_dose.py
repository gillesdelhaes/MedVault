import uuid
from sqlalchemy import String, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import DateTime
from database import Base
from encryption import EncryptedString


class MedicationDose(Base):
    __tablename__ = "medication_doses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    medication_id: Mapped[str] = mapped_column(String(36), ForeignKey("medications.id", ondelete="CASCADE"), nullable=False)
    taken_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False)
    quantity: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    notes: Mapped[str | None] = mapped_column(EncryptedString, nullable=True)

    medication: Mapped["Medication"] = relationship("Medication", back_populates="doses")
