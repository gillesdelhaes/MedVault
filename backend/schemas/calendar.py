import datetime as dt
from pydantic import BaseModel
from typing import Optional, List


class CalendarEvent(BaseModel):
    id: str
    type: str  # "appointment" | "symptom" | "medication"
    patient_id: str
    patient_name: str
    patient_color: str
    datetime: dt.datetime
    title: str
    detail: Optional[str] = None
    follow_up_required: Optional[bool] = None
    severity: Optional[int] = None
    is_ongoing: Optional[bool] = None


class CalendarResponse(BaseModel):
    events: List[CalendarEvent]
