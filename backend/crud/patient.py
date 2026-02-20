import uuid
from typing import Optional, List
from sqlalchemy.orm import Session
from models.patient import Patient
from schemas.patient import PatientCreate, PatientUpdate


def get_patients(db: Session) -> List[Patient]:
    return db.query(Patient).order_by(Patient.name).all()


def get_patient(db: Session, patient_id: str) -> Optional[Patient]:
    return db.query(Patient).filter(Patient.id == patient_id).first()


def create_patient(db: Session, data: PatientCreate) -> Patient:
    patient = Patient(id=str(uuid.uuid4()), **data.model_dump())
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


def update_patient(db: Session, patient: Patient, data: PatientUpdate) -> Patient:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(patient, field, value)
    db.commit()
    db.refresh(patient)
    return patient


def delete_patient(db: Session, patient: Patient) -> None:
    db.delete(patient)
    db.commit()
