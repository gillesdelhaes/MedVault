from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class AppointmentBase(BaseModel):
    patient_id: str
    datetime: datetime
    provider_name: str = Field(..., min_length=1, max_length=255)
    location: Optional[str] = None
    reason: Optional[str] = None
    follow_up_required: bool = False
    notes: Optional[str] = None


class AppointmentCreate(AppointmentBase):
    pass


class AppointmentUpdate(BaseModel):
    patient_id: Optional[str] = None
    datetime: Optional[datetime] = None
    provider_name: Optional[str] = Field(None, min_length=1, max_length=255)
    location: Optional[str] = None
    reason: Optional[str] = None
    follow_up_required: Optional[bool] = None
    notes: Optional[str] = None


class AppointmentResponse(AppointmentBase):
    id: str

    model_config = {"from_attributes": True}
