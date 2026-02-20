import uuid
from typing import Optional, List
from datetime import date
from sqlalchemy.orm import Session
from models.medication import Medication
from models.medication_dose import MedicationDose
from schemas.medication import MedicationCreate, MedicationUpdate, MedicationDoseCreate


def get_medications(
    db: Session,
    patient_id: Optional[str] = None,
) -> List[Medication]:
    q = db.query(Medication)
    if patient_id:
        q = q.filter(Medication.patient_id == patient_id)
    return q.order_by(Medication.start_date.desc()).all()


def get_medication(db: Session, medication_id: str) -> Optional[Medication]:
    return db.query(Medication).filter(Medication.id == medication_id).first()


def create_medication(db: Session, data: MedicationCreate) -> Medication:
    med = Medication(id=str(uuid.uuid4()), **data.model_dump())
    db.add(med)
    db.commit()
    db.refresh(med)
    return med


def update_medication(db: Session, med: Medication, data: MedicationUpdate) -> Medication:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(med, field, value)
    db.commit()
    db.refresh(med)
    return med


def delete_medication(db: Session, med: Medication) -> None:
    db.delete(med)
    db.commit()


def get_doses(db: Session, medication_id: str) -> List[MedicationDose]:
    return (
        db.query(MedicationDose)
        .filter(MedicationDose.medication_id == medication_id)
        .order_by(MedicationDose.taken_at.desc())
        .all()
    )


def create_dose(db: Session, medication_id: str, data: MedicationDoseCreate) -> MedicationDose:
    dose = MedicationDose(
        id=str(uuid.uuid4()),
        medication_id=medication_id,
        **data.model_dump(),
    )
    db.add(dose)
    db.commit()
    db.refresh(dose)
    return dose


def get_active_medications_for_range(
    db: Session,
    from_date: date,
    to_date: date,
    patient_id: Optional[str] = None,
) -> List[Medication]:
    """Return medications whose date range overlaps with [from_date, to_date]."""
    q = db.query(Medication)
    if patient_id:
        q = q.filter(Medication.patient_id == patient_id)
    # Active if: start_date <= to_date AND (is_ongoing OR end_date >= from_date)
    q = q.filter(Medication.start_date <= to_date)
    from sqlalchemy import or_
    q = q.filter(or_(Medication.is_ongoing == True, Medication.end_date >= from_date))
    return q.all()
