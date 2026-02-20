import uuid
from typing import Optional, List
from datetime import datetime
from sqlalchemy.orm import Session
from models.symptom_log import SymptomLog
from schemas.symptom_log import SymptomLogCreate, SymptomLogUpdate


def get_symptom_logs(
    db: Session,
    patient_id: Optional[str] = None,
    from_dt: Optional[datetime] = None,
    to_dt: Optional[datetime] = None,
) -> List[SymptomLog]:
    q = db.query(SymptomLog)
    if patient_id:
        q = q.filter(SymptomLog.patient_id == patient_id)
    if from_dt:
        q = q.filter(SymptomLog.logged_at >= from_dt)
    if to_dt:
        q = q.filter(SymptomLog.logged_at <= to_dt)
    return q.order_by(SymptomLog.logged_at.desc()).all()


def get_symptom_log(db: Session, log_id: str) -> Optional[SymptomLog]:
    return db.query(SymptomLog).filter(SymptomLog.id == log_id).first()


def create_symptom_log(db: Session, data: SymptomLogCreate) -> SymptomLog:
    log = SymptomLog(id=str(uuid.uuid4()), **data.model_dump())
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def update_symptom_log(db: Session, log: SymptomLog, data: SymptomLogUpdate) -> SymptomLog:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(log, field, value)
    db.commit()
    db.refresh(log)
    return log


def delete_symptom_log(db: Session, log: SymptomLog) -> None:
    db.delete(log)
    db.commit()
