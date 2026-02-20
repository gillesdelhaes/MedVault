from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List
import datetime as dt

from auth import get_current_user
from database import get_db
import crud.appointment as appt_crud
import crud.symptom_log as symptom_crud
import crud.medication as med_crud
import crud.patient as patient_crud
from pydantic import BaseModel

router = APIRouter(prefix="/api/search", tags=["search"])


class SearchResult(BaseModel):
    id: str
    type: str
    patient_id: str
    patient_name: str
    title: str
    detail: Optional[str] = None
    datetime: Optional[dt.datetime] = None


class SearchResponse(BaseModel):
    results: List[SearchResult]
    count: int


def _matches(query: str, *fields: Optional[str]) -> bool:
    q = query.lower()
    return any(f and q in f.lower() for f in fields)


@router.get("", response_model=SearchResponse)
def search(
    q: str = Query(..., min_length=1),
    type: Optional[str] = Query(None),
    patient_id: Optional[str] = Query(None),
    from_dt: Optional[dt.datetime] = Query(None, alias="from"),
    to_dt: Optional[dt.datetime] = Query(None, alias="to"),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    patients = {p.id: p for p in patient_crud.get_patients(db)}
    results: List[SearchResult] = []

    if not type or type == "appointment":
        appointments = appt_crud.get_appointments(db, patient_id=patient_id, from_dt=from_dt, to_dt=to_dt)
        for appt in appointments:
            if _matches(q, appt.provider_name, appt.reason, appt.location, appt.notes):
                p = patients.get(appt.patient_id)
                results.append(SearchResult(
                    id=appt.id,
                    type="appointment",
                    patient_id=appt.patient_id,
                    patient_name=p.name if p else "",
                    title=appt.provider_name,
                    detail=appt.reason,
                    datetime=appt.datetime,
                ))

    if not type or type == "symptom":
        symptoms = symptom_crud.get_symptom_logs(db, patient_id=patient_id, from_dt=from_dt, to_dt=to_dt)
        for sym in symptoms:
            if _matches(q, sym.description, sym.notes):
                p = patients.get(sym.patient_id)
                results.append(SearchResult(
                    id=sym.id,
                    type="symptom",
                    patient_id=sym.patient_id,
                    patient_name=p.name if p else "",
                    title=f"Symptom (severity {sym.severity})",
                    detail=sym.description,
                    datetime=sym.logged_at,
                ))

    if not type or type == "medication":
        medications = med_crud.get_medications(db, patient_id=patient_id)
        for med in medications:
            if _matches(q, med.name, med.dosage, med.notes, med.schedule_notes):
                p = patients.get(med.patient_id)
                results.append(SearchResult(
                    id=med.id,
                    type="medication",
                    patient_id=med.patient_id,
                    patient_name=p.name if p else "",
                    title=f"{med.name} {med.dosage}",
                    detail=med.schedule_notes,
                    datetime=None,
                ))

    results.sort(key=lambda r: r.datetime or dt.datetime.min, reverse=True)
    return SearchResponse(results=results, count=len(results))
