# api/app/models.py
import enum
from datetime import datetime
from sqlalchemy import String, DateTime, Enum, ForeignKey, Float, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .db import Base

class KycStatus(str, enum.Enum):
    NEW = "NEW"
    DOC_UPLOADED = "DOC_UPLOADED"
    LIVE_UPLOADED = "LIVE_UPLOADED"
    READY_FOR_REVIEW = "READY_FOR_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    NEEDS_RETRY = "NEEDS_RETRY"

class DocumentType(str, enum.Enum):
    PASSPORT = "PASSPORT"
    NRIC = "NRIC"
    OTHER = "OTHER"

class Decision(str, enum.Enum):
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    NEEDS_RETRY = "NEEDS_RETRY"

class KycSession(Base):
    __tablename__ = "kyc_sessions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    external_user_id: Mapped[str] = mapped_column(String(100), index=True)
    status: Mapped[KycStatus] = mapped_column(Enum(KycStatus), default=KycStatus.NEW, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    documents: Mapped[list["Document"]] = relationship(back_populates="session", cascade="all, delete-orphan")
    result: Mapped["KycResult"] = relationship(back_populates="session", uselist=False, cascade="all, delete-orphan")
    liveness: Mapped["LivenessArtifact"] = relationship(back_populates="session", uselist=False, cascade="all, delete-orphan")

class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("kyc_sessions.id", ondelete="CASCADE"), index=True)
    type: Mapped[DocumentType] = mapped_column(Enum(DocumentType))
    file_key: Mapped[str] = mapped_column(String(500))
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    session: Mapped["KycSession"] = relationship(back_populates="documents")

class LivenessArtifact(Base):
    __tablename__ = "liveness_artifacts"
    __table_args__ = (UniqueConstraint("session_id", name="uq_liveness_session_id"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("kyc_sessions.id", ondelete="CASCADE"), index=True)
    video_key: Mapped[str] = mapped_column(String(500))
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    session: Mapped["KycSession"] = relationship(back_populates="liveness")

class KycResult(Base):
    __tablename__ = "kyc_results"
    __table_args__ = (UniqueConstraint("session_id", name="uq_kyc_results_session_id"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("kyc_sessions.id", ondelete="CASCADE"), index=True)

    match_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    match_percent: Mapped[float | None] = mapped_column(Float, nullable=True)
    model_version: Mapped[str | None] = mapped_column(String(100), nullable=True)

    operator_decision: Mapped[Decision | None] = mapped_column(Enum(Decision), nullable=True)
    operator_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    session: Mapped["KycSession"] = relationship(back_populates="result")
