from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from auth import get_current_user
from database import get_db
from schemas.medication import (
    MedicationCreate, MedicationUpdate, MedicationResponse,
    MedicationDoseCreate, MedicationDoseResponse,
)
import crud.medication as med_crud

router = APIRouter(prefix="/api/medications", tags=["medications"])


@router.get("", response_model=List[MedicationResponse])
def list_medications(
    patient_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    return med_crud.get_medications(db, patient_id=patient_id)


@router.post("", response_model=MedicationResponse, status_code=status.HTTP_201_CREATED)
def create_medication(data: MedicationCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return med_crud.create_medication(db, data)


@router.get("/{medication_id}", response_model=MedicationResponse)
def get_medication(medication_id: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    med = med_crud.get_medication(db, medication_id)
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")
    return med


@router.put("/{medication_id}", response_model=MedicationResponse)
def update_medication(
    medication_id: str,
    data: MedicationUpdate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    med = med_crud.get_medication(db, medication_id)
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")
    return med_crud.update_medication(db, med, data)


@router.delete("/{medication_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_medication(medication_id: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    med = med_crud.get_medication(db, medication_id)
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")
    med_crud.delete_medication(db, med)


@router.post("/{medication_id}/doses", response_model=MedicationDoseResponse, status_code=status.HTTP_201_CREATED)
def log_dose(
    medication_id: str,
    data: MedicationDoseCreate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    med = med_crud.get_medication(db, medication_id)
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")
    return med_crud.create_dose(db, medication_id, data)


@router.get("/{medication_id}/doses", response_model=List[MedicationDoseResponse])
def list_doses(
    medication_id: str,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    med = med_crud.get_medication(db, medication_id)
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")
    return med_crud.get_doses(db, medication_id)
