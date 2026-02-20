from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from auth import get_current_user
from database import get_db
from schemas.patient import PatientCreate, PatientUpdate, PatientResponse
import crud.patient as patient_crud

router = APIRouter(prefix="/api/patients", tags=["patients"])


@router.get("", response_model=List[PatientResponse])
def list_patients(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return patient_crud.get_patients(db)


@router.post("", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
def create_patient(data: PatientCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return patient_crud.create_patient(db, data)


@router.get("/{patient_id}", response_model=PatientResponse)
def get_patient(patient_id: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    patient = patient_crud.get_patient(db, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


@router.put("/{patient_id}", response_model=PatientResponse)
def update_patient(patient_id: str, data: PatientUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    patient = patient_crud.get_patient(db, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient_crud.update_patient(db, patient, data)


@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_patient(patient_id: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    patient = patient_crud.get_patient(db, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    patient_crud.delete_patient(db, patient)
