from fastapi import APIRouter, Depends, Query, UploadFile, File
from sqlalchemy.orm import Session

from ..db import get_db
from .. import schemas
from .. import functions
from ..embedding import compute_face_embedding, compute_document_embedding
from ..models import EmbeddingKind


router = APIRouter()


@router.post("/sessions", response_model=schemas.SessionOut)
def create_session(payload: schemas.SessionCreate, db: Session = Depends(get_db)):
    return functions.create_session(db, payload.external_user_id)


@router.get("/sessions/{session_id}", response_model=schemas.SessionDetailOut)
def get_session(session_id: int, db: Session = Depends(get_db)):
    s = functions.get_session(db, session_id)
    # ensure relationships are loaded
    _ = s.documents
    _ = s.liveness
    _ = s.result
    return s


@router.post("/sessions/{session_id}/documents", response_model=schemas.DocumentOut)
def add_document(session_id: int, payload: schemas.DocumentCreate, db: Session = Depends(get_db)):
    return functions.add_document(db, session_id, payload.type, payload.file_key)


@router.post("/sessions/{session_id}/liveness", response_model=schemas.LivenessOut)
def set_liveness(session_id: int, payload: schemas.LivenessCreate, db: Session = Depends(get_db)):
    return functions.set_liveness(db, session_id, payload.video_key)


@router.post("/sessions/{session_id}/match", response_model=schemas.ResultOut)
def set_match(session_id: int, payload: schemas.MatchCreate, db: Session = Depends(get_db)):
    return functions.upsert_match_result(db, session_id, payload.match_score, payload.match_percent, payload.model_version)


@router.post("/sessions/{session_id}/decision", response_model=schemas.ResultOut)
def decide(session_id: int, payload: schemas.DecisionCreate, db: Session = Depends(get_db)):
    return functions.set_operator_decision(db, session_id, payload.operator_decision, payload.operator_note)


@router.get("/sessions", response_model=schemas.SessionListOut)
def list_sessions(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    items, total = functions.list_sessions(db, limit=limit, offset=offset)
    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.post("/sessions/{session_id}/face-image")
async def upload_face_image(session_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    # Persist the image under data/faces and compute embedding if available
    import os, time
    from pathlib import Path

    # Ensure session exists
    _ = functions.get_session(db, session_id)

    data_dir = Path("data/faces")
    data_dir.mkdir(parents=True, exist_ok=True)
    ts = int(time.time())
    dest = data_dir / f"session_{session_id}_{ts}.jpg"
    content = await file.read()
    with open(dest, "wb") as f:
        f.write(content)

    embedding = None
    message = None
    try:
        embedding = compute_face_embedding(content)
    except Exception as e:
        message = f"Embedding not computed: {e}"
    if embedding is not None:
        functions.save_embedding(db, session_id, EmbeddingKind.FACE, embedding, str(dest))
    return {"ok": True, "file_key": str(dest), "embedding_dim": (len(embedding) if embedding else None), "message": message}


@router.post("/sessions/{session_id}/document-image")
async def upload_document_image(session_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    # Simple document embedding: resize grayscale to 64x64, flatten and normalize
    import time
    from pathlib import Path
    import numpy as np  # type: ignore
    import cv2  # type: ignore

    _ = functions.get_session(db, session_id)
    data_dir = Path("data/docs")
    data_dir.mkdir(parents=True, exist_ok=True)
    ts = int(time.time())
    dest = data_dir / f"session_{session_id}_{ts}.jpg"
    content = await file.read()
    with open(dest, "wb") as f:
        f.write(content)

    try:
        embedding = compute_document_embedding(content)
        functions.save_embedding(db, session_id, EmbeddingKind.DOCUMENT, embedding, str(dest))
        return {"ok": True, "file_key": str(dest), "embedding_dim": len(embedding)}
    except Exception as e:
        return {"ok": False, "file_key": str(dest), "message": f"Embedding not computed: {e}"}


@router.get("/sessions/{session_id}/embeddings")
def list_embeddings(session_id: int, db: Session = Depends(get_db)):
    from sqlalchemy import select, desc
    from ..models import Embedding
    rows = db.execute(select(Embedding).where(Embedding.session_id == session_id).order_by(desc(Embedding.id))).scalars().all()
    return [
        {
            "id": r.id,
            "session_id": r.session_id,
            "kind": r.kind.value,
            "file_key": r.file_key,
            "dim": r.dim,
            "created_at": r.created_at.isoformat(),
        }
        for r in rows
    ]


@router.post("/sessions/{session_id}/liveness-video")
async def upload_liveness_video(session_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Accept a recorded liveness video and store it; also update liveness metadata."""
    import time
    from pathlib import Path
    import cv2  # type: ignore
    import numpy as np  # type: ignore
    _ = functions.get_session(db, session_id)
    data_dir = Path("data/liveness")
    data_dir.mkdir(parents=True, exist_ok=True)
    ts = int(time.time())
    dest = data_dir / f"session_{session_id}_{ts}.webm"
    content = await file.read()
    with open(dest, "wb") as f:
        f.write(content)

    # update liveness metadata to reference stored key and bump status
    try:
        functions.set_liveness(db, session_id, str(dest))
    except Exception:
        pass

    # Try to extract a representative frame and compute a FACE embedding
    embedding_dim = None
    try:
        cap = cv2.VideoCapture(str(dest))
        if cap.isOpened():
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
            target = max(0, frame_count // 2)
            if frame_count > 0:
                cap.set(cv2.CAP_PROP_POS_FRAMES, target)
            ok, frame = cap.read()
            if not ok:
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                ok, frame = cap.read()
            cap.release()
            if ok and frame is not None:
                # Encode to JPEG and compute embedding
                _, buf = cv2.imencode('.jpg', frame)
                from ..embedding import compute_face_embedding
                emb = compute_face_embedding(buf.tobytes())
                if emb is not None:
                    from ..models import EmbeddingKind
                    functions.save_embedding(db, session_id, EmbeddingKind.FACE, emb, str(dest))
                    embedding_dim = len(emb)
    except Exception:
        # Best-effort — keep upload ok even if embedding fails
        pass

    return {"ok": True, "file_key": str(dest), "embedding_dim": embedding_dim}
