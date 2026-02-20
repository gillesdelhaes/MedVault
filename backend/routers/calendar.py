from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, date

from auth import get_current_user
from database import get_db
from schemas.calendar import CalendarResponse, CalendarEvent
import crud.appointment as appt_crud
import crud.symptom_log as symptom_crud
import crud.medication as med_crud
import crud.patient as patient_crud

router = APIRouter(prefix="/api/calendar", tags=["calendar"])


@router.get("", response_model=CalendarResponse)
def get_calendar(
    from_dt: datetime = Query(..., alias="from"),
    to_dt: datetime = Query(..., alias="to"),
    patient_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    # Build a patient lookup for name/color
    patients = {p.id: p for p in patient_crud.get_patients(db)}

    events: list[CalendarEvent] = []

    # Appointments
    appointments = appt_crud.get_appointments(db, patient_id=patient_id, from_dt=from_dt, to_dt=to_dt)
    for appt in appointments:
        p = patients.get(appt.patient_id)
        if not p:
            continue
        events.append(CalendarEvent(
            id=appt.id,
            type="appointment",
            patient_id=appt.patient_id,
            patient_name=p.name,
            patient_color=p.color,
            datetime=appt.datetime,
            title=appt.provider_name,
            detail=appt.reason,
            follow_up_required=appt.follow_up_required,
        ))

    # Symptom logs
    symptoms = symptom_crud.get_symptom_logs(db, patient_id=patient_id, from_dt=from_dt, to_dt=to_dt)
    for sym in symptoms:
        p = patients.get(sym.patient_id)
        if not p:
            continue
        events.append(CalendarEvent(
            id=sym.id,
            type="symptom",
            patient_id=sym.patient_id,
            patient_name=p.name,
            patient_color=p.color,
            datetime=sym.logged_at,
            title=f"Symptom (severity {sym.severity})",
            detail=sym.description,
            severity=sym.severity,
        ))

    # Active medications — emit one event per day they are active in range
    from_date = from_dt.date()
    to_date = to_dt.date()
    meds = med_crud.get_active_medications_for_range(db, from_date, to_date, patient_id=patient_id)
    from datetime import timedelta
    for med in meds:
        p = patients.get(med.patient_id)
        if not p:
            continue
        # Clamp to visible range
        med_start = max(med.start_date, from_date)
        if med.is_ongoing:
            med_end = to_date
        else:
            med_end = min(med.end_date, to_date) if med.end_date else to_date

        current = med_start
        while current <= med_end:
            events.append(CalendarEvent(
                id=f"{med.id}:{current.isoformat()}",
                type="medication",
                patient_id=med.patient_id,
                patient_name=p.name,
                patient_color=p.color,
                datetime=datetime.combine(current, datetime.min.time()),
                title=f"{med.name} {med.dosage}",
                detail=f"{med.frequency_per_day}x/day",
                is_ongoing=med.is_ongoing,
            ))
            current += timedelta(days=1)

    events.sort(key=lambda e: e.datetime)
    return CalendarResponse(events=events)
