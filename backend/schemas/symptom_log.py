from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class SymptomLogBase(BaseModel):
    patient_id: str
    logged_at: datetime
    severity: int = Field(..., ge=1, le=5)
    description: Optional[str] = None
    resolved_at: Optional[datetime] = None
    notes: Optional[str] = None


class SymptomLogCreate(SymptomLogBase):
    pass


class SymptomLogUpdate(BaseModel):
    patient_id: Optional[str] = None
    logged_at: Optional[datetime] = None
    severity: Optional[int] = Field(None, ge=1, le=5)
    description: Optional[str] = None
    resolved_at: Optional[datetime] = None
    notes: Optional[str] = None


class SymptomLogResponse(SymptomLogBase):
    id: str

    model_config = {"from_attributes": True}
