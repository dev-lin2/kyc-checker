FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# System deps for scientific stack / OpenCV headless
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ffmpeg \
    libsm6 \
    libxext6 \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt \
    && python -c "import onnxruntime; print('onnxruntime OK')"

# Optional: download models at build time when URLs are provided
ARG FACE_MODEL_URL=""
ARG CLIP_IMAGE_MODEL_URL=""
RUN set -eux; \
    mkdir -p /app/models; \
    if [ -n "$FACE_MODEL_URL" ]; then curl -L "$FACE_MODEL_URL" -o /app/models/face.onnx; fi; \
    if [ -n "$CLIP_IMAGE_MODEL_URL" ]; then curl -L "$CLIP_IMAGE_MODEL_URL" -o /app/models/clip_image.onnx; fi

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
