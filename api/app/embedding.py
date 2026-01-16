from __future__ import annotations

import io
from pathlib import Path
from typing import Optional, List

import numpy as np  # type: ignore
import onnxruntime as ort  # type: ignore
import cv2  # type: ignore


_face_sess: Optional[ort.InferenceSession] = None
_clip_sess: Optional[ort.InferenceSession] = None


def _lazy_init():
    global _face_sess, _clip_sess
    models_dir = Path("models")
    face_model = models_dir / "face.onnx"
    clip_model = models_dir / "clip_image.onnx"
    sess_opts = ort.SessionOptions()
    sess_opts.enable_mem_pattern = False
    sess_opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_EXTENDED

    if _face_sess is None and face_model.exists():
        _face_sess = ort.InferenceSession(str(face_model), sess_options=sess_opts, providers=["CPUExecutionProvider"])

    if _clip_sess is None and clip_model.exists():
        _clip_sess = ort.InferenceSession(str(clip_model), sess_options=sess_opts, providers=["CPUExecutionProvider"])


def _imdecode_rgb(image_bytes: bytes) -> np.ndarray:
    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if bgr is None:
        raise RuntimeError("Failed to decode image")
    return cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)


def _normalize(x: np.ndarray, mean: tuple[float, float, float], std: tuple[float, float, float]) -> np.ndarray:
    x = x.astype(np.float32) / 255.0
    for i in range(3):
        x[..., i] = (x[..., i] - mean[i]) / std[i]
    return x


def compute_face_embedding(image_bytes: bytes) -> Optional[List[float]]:
    """Compute face embedding using ONNX model at models/face.onnx.
    Expects input 1x3x112x112 or 1x3x224x224 depending on model.
    Returns list[float] or raises if not possible.
    """
    _lazy_init()
    if _face_sess is None:
        raise RuntimeError("Face ONNX model not found at models/face.onnx")

    rgb = _imdecode_rgb(image_bytes)
    # Center-crop square and resize to 112x112 (common for ArcFace)
    h, w, _ = rgb.shape
    side = min(h, w)
    y0 = (h - side) // 2
    x0 = (w - side) // 2
    crop = rgb[y0:y0 + side, x0:x0 + side]
    inp = cv2.resize(crop, (112, 112), interpolation=cv2.INTER_AREA)
    inp = _normalize(inp, (0.5, 0.5, 0.5), (0.5, 0.5, 0.5))
    inp = np.transpose(inp, (2, 0, 1))[None, ...].astype(np.float32)

    # Infer: try to find the first input name automatically
    input_name = _face_sess.get_inputs()[0].name
    out = _face_sess.run(None, {input_name: inp})
    vec = out[0].squeeze().astype(np.float32)
    # L2 normalize
    norm = np.linalg.norm(vec) + 1e-8
    vec = vec / norm
    return vec.tolist()


def compute_document_embedding(image_bytes: bytes) -> List[float]:
    """Compute document embedding using CLIP image encoder at models/clip_image.onnx.
    Falls back to a normalized grayscale 64x64 vector if model not found.
    """
    _lazy_init()
    rgb = _imdecode_rgb(image_bytes)

    if _clip_sess is not None:
        img = cv2.resize(rgb, (224, 224), interpolation=cv2.INTER_AREA)
        # CLIP mean/std
        img = _normalize(img, (0.48145466, 0.4578275, 0.40821073), (0.26862954, 0.26130258, 0.27577711))
        inp = np.transpose(img, (2, 0, 1))[None, ...].astype(np.float32)
        input_name = _clip_sess.get_inputs()[0].name
        out = _clip_sess.run(None, {input_name: inp})
        vec = out[0].squeeze().astype(np.float32)
        norm = np.linalg.norm(vec) + 1e-8
        vec = vec / norm
        return vec.tolist()

    # Fallback: grayscale 64x64 normalized vector
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    small = cv2.resize(gray, (64, 64), interpolation=cv2.INTER_AREA)
    vec = small.astype(np.float32).reshape(-1)
    norm = np.linalg.norm(vec) + 1e-8
    vec = vec / norm
    return vec.tolist()

