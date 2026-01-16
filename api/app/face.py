from __future__ import annotations

# Lightweight wrapper for computing embeddings from an image.
# Intentionally tolerant: if heavy deps are unavailable, returns a stub.

from typing import Optional, List

_model = None


def _lazy_init():
    global _model
    if _model is not None:
        return
    try:
        import insightface  # type: ignore
        from insightface.app import FaceAnalysis  # type: ignore

        app = FaceAnalysis(name="buffalo_l")
        app.prepare(ctx_id=0, det_size=(640, 640))
        _model = app
    except Exception as e:  # pragma: no cover
        _model = e  # store the exception to report later


def compute_embedding_from_image(image_bytes: bytes) -> Optional[List[float]]:
    """Compute a face embedding vector from a single RGB image.

    Returns a list[float] or None if not available.
    """
    _lazy_init()
    if isinstance(_model, Exception):
        raise RuntimeError(
            f"insightface unavailable: {_model}. Install 'insightface' and 'onnxruntime' in the API container."
        )
    app = _model
    import numpy as np  # type: ignore
    import cv2  # type: ignore
    import io

    # Decode image bytes
    img_array = np.frombuffer(image_bytes, dtype=np.uint8)
    bgr = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    if bgr is None:
        raise RuntimeError("Failed to decode image")
    # Convert to RGB
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)

    faces = app.get(rgb)
    if not faces:
        raise RuntimeError("No face detected in image")
    # Use first face
    emb = faces[0].embedding
    return emb.tolist()

