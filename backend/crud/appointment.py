import uuid
from typing import Optional, List
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_
from models.appointment import Appointment
from schemas.appointment import AppointmentCreate, AppointmentUpdate


def get_appointments(
    db: Session,
    patient_id: Optional[str] = None,
    from_dt: Optional[datetime] = None,
    to_dt: Optional[datetime] = None,
) -> List[Appointment]:
    q = db.query(Appointment)
    if patient_id:
        q = q.filter(Appointment.patient_id == patient_id)
    if from_dt:
        q = q.filter(Appointment.datetime >= from_dt)
    if to_dt:
        q = q.filter(Appointment.datetime <= to_dt)
    return q.order_by(Appointment.datetime.desc()).all()


def get_appointment(db: Session, appointment_id: str) -> Optional[Appointment]:
    return db.query(Appointment).filter(Appointment.id == appointment_id).first()


def create_appointment(db: Session, data: AppointmentCreate) -> Appointment:
    appt = Appointment(id=str(uuid.uuid4()), **data.model_dump())
    db.add(appt)
    db.commit()
    db.refresh(appt)
    return appt


def update_appointment(db: Session, appt: Appointment, data: AppointmentUpdate) -> Appointment:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(appt, field, value)
    db.commit()
    db.refresh(appt)
    return appt


def delete_appointment(db: Session, appt: Appointment) -> None:
    db.delete(appt)
    db.commit()
