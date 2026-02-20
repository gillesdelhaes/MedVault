from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from auth import get_current_user
from database import get_db
from schemas.symptom_log import SymptomLogCreate, SymptomLogUpdate, SymptomLogResponse
import crud.symptom_log as symptom_crud

router = APIRouter(prefix="/api/symptoms", tags=["symptoms"])


@router.get("", response_model=List[SymptomLogResponse])
def list_symptoms(
    patient_id: Optional[str] = Query(None),
    from_dt: Optional[datetime] = Query(None, alias="from"),
    to_dt: Optional[datetime] = Query(None, alias="to"),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    return symptom_crud.get_symptom_logs(db, patient_id=patient_id, from_dt=from_dt, to_dt=to_dt)


@router.post("", response_model=SymptomLogResponse, status_code=status.HTTP_201_CREATED)
def create_symptom(data: SymptomLogCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return symptom_crud.create_symptom_log(db, data)


@router.get("/{log_id}", response_model=SymptomLogResponse)
def get_symptom(log_id: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    log = symptom_crud.get_symptom_log(db, log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Symptom log not found")
    return log


@router.put("/{log_id}", response_model=SymptomLogResponse)
def update_symptom(
    log_id: str,
    data: SymptomLogUpdate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    log = symptom_crud.get_symptom_log(db, log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Symptom log not found")
    return symptom_crud.update_symptom_log(db, log, data)


@router.delete("/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_symptom(log_id: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    log = symptom_crud.get_symptom_log(db, log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Symptom log not found")
    symptom_crud.delete_symptom_log(db, log)
