# api/app/functions.py
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import select, func, desc
from fastapi import HTTPException

from .models import KycSession, Document, LivenessArtifact, KycResult, KycStatus

def create_session(db: Session, external_user_id: str) -> KycSession:
    s = KycSession(external_user_id=external_user_id)
    db.add(s)
    db.commit()
    db.refresh(s)
    return s

def get_session(db: Session, session_id: int) -> KycSession:
    s = db.get(KycSession, session_id)
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    return s

def add_document(db: Session, session_id: int, doc_type, file_key: str) -> Document:
    s = get_session(db, session_id)
    d = Document(session_id=session_id, type=doc_type, file_key=file_key)
    db.add(d)

    # status bump
    if s.status == KycStatus.NEW:
        s.status = KycStatus.DOC_UPLOADED

    db.commit()
    db.refresh(d)
    return d

def set_liveness(db: Session, session_id: int, video_key: str) -> LivenessArtifact:
    s = get_session(db, session_id)

    existing = db.execute(select(LivenessArtifact).where(LivenessArtifact.session_id == session_id)).scalar_one_or_none()
    if existing:
        existing.video_key = video_key
        existing.uploaded_at = datetime.utcnow()
        artifact = existing
    else:
        artifact = LivenessArtifact(session_id=session_id, video_key=video_key)
        db.add(artifact)

    # status bump
    if s.status in (KycStatus.NEW, KycStatus.DOC_UPLOADED):
        s.status = KycStatus.LIVE_UPLOADED

    db.commit()
    db.refresh(artifact)
    return artifact

def upsert_match_result(db: Session, session_id: int, match_score: float, match_percent: float, model_version: str | None) -> KycResult:
    s = get_session(db, session_id)

    res = db.execute(select(KycResult).where(KycResult.session_id == session_id)).scalar_one_or_none()
    if res:
        res.match_score = match_score
        res.match_percent = match_percent
        res.model_version = model_version
        res.updated_at = datetime.utcnow()
        out = res
    else:
        out = KycResult(
            session_id=session_id,
            match_score=match_score,
            match_percent=match_percent,
            model_version=model_version,
        )
        db.add(out)

    # status bump to review-ready
    s.status = KycStatus.READY_FOR_REVIEW

    db.commit()
    db.refresh(out)
    return out

def set_operator_decision(db: Session, session_id: int, decision, note: str | None) -> KycResult:
    s = get_session(db, session_id)

    res = db.execute(select(KycResult).where(KycResult.session_id == session_id)).scalar_one_or_none()
    if not res:
        # Create empty result if operator decides without match yet
        res = KycResult(session_id=session_id)
        db.add(res)

    res.operator_decision = decision
    res.operator_note = note
    res.decided_at = datetime.utcnow()
    res.updated_at = datetime.utcnow()

    # status follows decision
    if str(decision) == "Decision.APPROVED" or decision.value == "APPROVED":
        s.status = KycStatus.APPROVED
    elif decision.value == "REJECTED":
        s.status = KycStatus.REJECTED
    else:
        s.status = KycStatus.NEEDS_RETRY

    db.commit()
    db.refresh(res)
    return res

def list_sessions(db: Session, limit: int = 20, offset: int = 0):
    total = db.execute(select(func.count()).select_from(KycSession)).scalar_one()
    items = db.execute(
        select(KycSession).order_by(desc(KycSession.id)).limit(limit).offset(offset)
    ).scalars().all()
    return items, total
