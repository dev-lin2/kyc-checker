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
    # Require a face on the document image (front side)
    import time
    from pathlib import Path

    _ = functions.get_session(db, session_id)
    data_dir = Path("data/docs")
    data_dir.mkdir(parents=True, exist_ok=True)
    ts = int(time.time())
    dest = data_dir / f"session_{session_id}_{ts}.jpg"
    content = await file.read()
    with open(dest, "wb") as f:
        f.write(content)

    try:
        embedding = compute_face_embedding(content)
        if not embedding:
            return {"ok": False, "file_key": str(dest), "message": "No face detected on document"}
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
    import subprocess
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
        # Extract a representative frame to JPEG using ffmpeg's thumbnail filter
        frame_jpg = data_dir / f"session_{session_id}_{ts}.jpg"
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-i",
                str(dest),
                "-vf",
                "thumbnail,scale=640:-1",
                "-frames:v",
                "1",
                str(frame_jpg),
            ],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )

        if frame_jpg.exists():
            data = frame_jpg.read_bytes()
            from ..embedding import compute_face_embedding
            emb = compute_face_embedding(data)
            if emb:
                from ..models import EmbeddingKind
                functions.save_embedding(db, session_id, EmbeddingKind.FACE, emb, str(dest))
                embedding_dim = len(emb)
    except Exception:
        # Best-effort — keep upload ok even if embedding fails
        pass

    return {"ok": True, "file_key": str(dest), "embedding_dim": embedding_dim}


@router.post("/sessions/{session_id}/match/compute")
def compute_match(session_id: int, db: Session = Depends(get_db)):
    """Compute cosine similarity between latest FACE and DOCUMENT embeddings for the session.

    Saves the score into KycResult and returns the values.
    """
    from sqlalchemy import select, desc
    from ..models import Embedding, EmbeddingKind
    import json
    import math

    _ = functions.get_session(db, session_id)

    face = db.execute(
        select(Embedding)
        .where(Embedding.session_id == session_id, Embedding.kind == EmbeddingKind.FACE)
        .order_by(desc(Embedding.id))
        .limit(1)
    ).scalar_one_or_none()

    doc = db.execute(
        select(Embedding)
        .where(Embedding.session_id == session_id, Embedding.kind == EmbeddingKind.DOCUMENT)
        .order_by(desc(Embedding.id))
        .limit(1)
    ).scalar_one_or_none()

    if not face or not doc:
        return {"ok": False, "message": "Need both FACE and DOCUMENT embeddings"}

    try:
        import numpy as np  # type: ignore
        f = np.array(json.loads(face.vector_json), dtype=np.float32)
        d = np.array(json.loads(doc.vector_json), dtype=np.float32)
        # both are L2 normalized by construction, but normalize again for safety
        def norm(x):
            n = float(np.linalg.norm(x) + 1e-8)
            return x / n
        f = norm(f)
        d = norm(d)
        score = float(np.dot(f, d))  # cosine
        percent = int(round(((score + 1.0) / 2.0) * 100))
        functions.upsert_match_result(db, session_id, score, percent, "cosine-v1")
        return {"ok": True, "score": score, "percent": percent}
    except Exception as e:
        return {"ok": False, "message": str(e)}


@router.get("/users/summary")
def users_summary(db: Session = Depends(get_db)):
    """Return a list of user-level summaries with doc/kyc upload flags and latest percent."""
    from sqlalchemy import select, func, desc
    from ..models import KycSession, Embedding, EmbeddingKind, KycResult

    # All user ids
    users = [row[0] for row in db.execute(select(KycSession.external_user_id).distinct()).all()]
    out = []
    for uid in users:
        # Any embeddings by kind for this user
        has_doc = db.execute(
            select(func.count())
            .select_from(Embedding)
            .join(KycSession, Embedding.session_id == KycSession.id)
            .where(KycSession.external_user_id == uid, Embedding.kind == EmbeddingKind.DOCUMENT)
        ).scalar_one() > 0
        has_face = db.execute(
            select(func.count())
            .select_from(Embedding)
            .join(KycSession, Embedding.session_id == KycSession.id)
            .where(KycSession.external_user_id == uid, Embedding.kind == EmbeddingKind.FACE)
        ).scalar_one() > 0

        # Latest percent from any session's result
        latest_percent = db.execute(
            select(KycResult.match_percent)
            .join(KycSession, KycResult.session_id == KycSession.id)
            .where(KycSession.external_user_id == uid)
            .order_by(desc(KycResult.updated_at))
            .limit(1)
        ).scalar_one_or_none()

        out.append({
            "external_user_id": uid,
            "doc_uploaded": has_doc,
            "kyc_uploaded": has_face,
            "percent": latest_percent,
        })
    return {"items": out}


@router.post("/users/{external_user_id}/match/compute")
def user_compute_match(external_user_id: str, db: Session = Depends(get_db)):
    """Compute cosine similarity between the latest FACE and DOCUMENT embeddings across all sessions for a user.

    Saves the score into the user's latest session KycResult and returns the values.
    """
    from sqlalchemy import select, desc
    from ..models import Embedding, EmbeddingKind, KycSession
    import json
    try:
        import numpy as np  # type: ignore
    except Exception as e:
        return {"ok": False, "message": f"numpy not available: {e}"}

    # Latest face/doc embeddings for this user
    face = db.execute(
        select(Embedding)
        .join(KycSession, Embedding.session_id == KycSession.id)
        .where(KycSession.external_user_id == external_user_id, Embedding.kind == EmbeddingKind.FACE)
        .order_by(desc(Embedding.id))
        .limit(1)
    ).scalar_one_or_none()
    doc = db.execute(
        select(Embedding)
        .join(KycSession, Embedding.session_id == KycSession.id)
        .where(KycSession.external_user_id == external_user_id, Embedding.kind == EmbeddingKind.DOCUMENT)
        .order_by(desc(Embedding.id))
        .limit(1)
    ).scalar_one_or_none()

    if not face or not doc:
        return {"ok": False, "message": "Need both FACE and DOCUMENT embeddings"}

    f = np.array(json.loads(face.vector_json), dtype=np.float32)
    d = np.array(json.loads(doc.vector_json), dtype=np.float32)
    def norm(x):
        n = float(np.linalg.norm(x) + 1e-8)
        return x / n
    f = norm(f)
    d = norm(d)
    score = float(np.dot(f, d))
    percent = int(round(((score + 1.0) / 2.0) * 100))

    # Save into latest session for this user
    latest_session = db.execute(
        select(KycSession).where(KycSession.external_user_id == external_user_id).order_by(desc(KycSession.id)).limit(1)
    ).scalar_one_or_none()
    if latest_session:
        functions.upsert_match_result(db, latest_session.id, score, percent, "cosine-v1")

    return {"ok": True, "score": score, "percent": percent}
