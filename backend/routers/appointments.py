from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from auth import get_current_user
from database import get_db
from schemas.appointment import AppointmentCreate, AppointmentUpdate, AppointmentResponse
import crud.appointment as appt_crud

router = APIRouter(prefix="/api/appointments", tags=["appointments"])


@router.get("", response_model=List[AppointmentResponse])
def list_appointments(
    patient_id: Optional[str] = Query(None),
    from_dt: Optional[datetime] = Query(None, alias="from"),
    to_dt: Optional[datetime] = Query(None, alias="to"),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    return appt_crud.get_appointments(db, patient_id=patient_id, from_dt=from_dt, to_dt=to_dt)


@router.post("", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
def create_appointment(data: AppointmentCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return appt_crud.create_appointment(db, data)


@router.get("/{appointment_id}", response_model=AppointmentResponse)
def get_appointment(appointment_id: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    appt = appt_crud.get_appointment(db, appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appt


@router.put("/{appointment_id}", response_model=AppointmentResponse)
def update_appointment(
    appointment_id: str,
    data: AppointmentUpdate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    appt = appt_crud.get_appointment(db, appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appt_crud.update_appointment(db, appt, data)


@router.delete("/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_appointment(appointment_id: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    appt = appt_crud.get_appointment(db, appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    appt_crud.delete_appointment(db, appt)
