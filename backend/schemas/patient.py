from pydantic import BaseModel, Field
from typing import Optional
from datetime import date


class PatientBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    date_of_birth: Optional[date] = None
    color: str = Field(default="#4A6FA5", pattern=r"^#[0-9A-Fa-f]{6}$")
    notes: Optional[str] = None


class PatientCreate(PatientBase):
    pass


class PatientUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    date_of_birth: Optional[date] = None
    color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    notes: Optional[str] = None


class PatientResponse(PatientBase):
    id: str

    model_config = {"from_attributes": True}
