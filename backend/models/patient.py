import uuid
from sqlalchemy import String, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base
from encryption import EncryptedString


class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    date_of_birth: Mapped[Date] = mapped_column(Date, nullable=True)
    color: Mapped[str] = mapped_column(String(7), nullable=False, default="#4A6FA5")
    notes: Mapped[str | None] = mapped_column(EncryptedString, nullable=True)

    appointments: Mapped[list["Appointment"]] = relationship(
        "Appointment", back_populates="patient", cascade="all, delete-orphan"
    )
    symptom_logs: Mapped[list["SymptomLog"]] = relationship(
        "SymptomLog", back_populates="patient", cascade="all, delete-orphan"
    )
    medications: Mapped[list["Medication"]] = relationship(
        "Medication", back_populates="patient", cascade="all, delete-orphan"
    )
