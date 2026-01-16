# api/main.py
from fastapi import FastAPI, Depends, Query
from sqlalchemy.orm import Session

from app.db import engine, get_db
from app.models import Base
from app import schemas
from app import functions

app = FastAPI()

@app.on_event("startup")
def on_startup():
    # MVP: auto-create tables
    Base.metadata.create_all(bind=engine)

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/sessions", response_model=schemas.SessionOut)
def create_session(payload: schemas.SessionCreate, db: Session = Depends(get_db)):
    return functions.create_session(db, payload.external_user_id)

@app.get("/sessions/{session_id}", response_model=schemas.SessionDetailOut)
def get_session(session_id: int, db: Session = Depends(get_db)):
    s = functions.get_session(db, session_id)
    # relationships are lazy; ensure loaded by access
    _ = s.documents
    _ = s.liveness
    _ = s.result
    return s

@app.post("/sessions/{session_id}/documents", response_model=schemas.DocumentOut)
def add_document(session_id: int, payload: schemas.DocumentCreate, db: Session = Depends(get_db)):
    return functions.add_document(db, session_id, payload.type, payload.file_key)

@app.post("/sessions/{session_id}/liveness", response_model=schemas.LivenessOut)
def set_liveness(session_id: int, payload: schemas.LivenessCreate, db: Session = Depends(get_db)):
    return functions.set_liveness(db, session_id, payload.video_key)

@app.post("/sessions/{session_id}/match", response_model=schemas.ResultOut)
def set_match(session_id: int, payload: schemas.MatchCreate, db: Session = Depends(get_db)):
    return functions.upsert_match_result(db, session_id, payload.match_score, payload.match_percent, payload.model_version)

@app.post("/sessions/{session_id}/decision", response_model=schemas.ResultOut)
def decide(session_id: int, payload: schemas.DecisionCreate, db: Session = Depends(get_db)):
    return functions.set_operator_decision(db, session_id, payload.operator_decision, payload.operator_note)

@app.get("/sessions", response_model=schemas.SessionListOut)
def list_sessions(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    items, total = functions.list_sessions(db, limit=limit, offset=offset)
    return {"items": items, "total": total, "limit": limit, "offset": offset}