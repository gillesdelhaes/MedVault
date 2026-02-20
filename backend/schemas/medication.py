from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime


class MedicationBase(BaseModel):
    patient_id: str
    name: str = Field(..., min_length=1, max_length=255)
    dosage: str = Field(..., min_length=1, max_length=100)
    frequency_per_day: int = Field(default=1, ge=1)
    start_date: date
    end_date: Optional[date] = None
    is_ongoing: bool = False
    schedule_notes: Optional[str] = None
    notes: Optional[str] = None


class MedicationCreate(MedicationBase):
    pass


class MedicationUpdate(BaseModel):
    patient_id: Optional[str] = None
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    dosage: Optional[str] = Field(None, min_length=1, max_length=100)
    frequency_per_day: Optional[int] = Field(None, ge=1)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_ongoing: Optional[bool] = None
    schedule_notes: Optional[str] = None
    notes: Optional[str] = None


class MedicationResponse(MedicationBase):
    id: str

    model_config = {"from_attributes": True}


class MedicationDoseCreate(BaseModel):
    taken_at: datetime
    quantity: float = Field(default=1.0, gt=0)
    notes: Optional[str] = None


class MedicationDoseResponse(MedicationDoseCreate):
    id: str
    medication_id: str

    model_config = {"from_attributes": True}
