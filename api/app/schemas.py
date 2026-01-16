# api/app/schemas.py
from datetime import datetime
from pydantic import BaseModel, Field
from .models import KycStatus, DocumentType, Decision

class SessionCreate(BaseModel):
    external_user_id: str = Field(min_length=1, max_length=100)

class SessionOut(BaseModel):
    id: int
    external_user_id: str
    status: KycStatus
    created_at: datetime
    updated_at: datetime

class DocumentCreate(BaseModel):
    type: DocumentType
    file_key: str = Field(min_length=1, max_length=500)

class LivenessCreate(BaseModel):
    video_key: str = Field(min_length=1, max_length=500)

class MatchCreate(BaseModel):
    match_score: float
    match_percent: float
    model_version: str | None = None

class DecisionCreate(BaseModel):
    operator_decision: Decision
    operator_note: str | None = None

class DocumentOut(BaseModel):
    id: int
    type: DocumentType
    file_key: str
    uploaded_at: datetime

class LivenessOut(BaseModel):
    video_key: str
    uploaded_at: datetime

class ResultOut(BaseModel):
    match_score: float | None
    match_percent: float | None
    model_version: str | None
    operator_decision: Decision | None
    operator_note: str | None
    decided_at: datetime | None
    updated_at: datetime

class SessionDetailOut(SessionOut):
    documents: list[DocumentOut] = []
    liveness: LivenessOut | None = None
    result: ResultOut | None = None
