KYC MVP
=======

Minimal KYC demo with a React (Vite) web app and a FastAPI backend.

Features
--------
- User‑centric flow using `user_id` (no manual `session_id`)
- Liveness recording (video) → face embedding
- Document upload (front with face) → face embedding
- Per‑user matching (cosine) between liveness and document embeddings
- Status page grouped by user with “Compute” action

Quick Start (Dev)
-----------------
Requirements: Docker, Docker Compose.

```
# Start dev stack
docker compose up -d

# Web: http://localhost:8080
# API health: http://localhost:8080/api/health
```

Notes (dev):
- Web runs in dev mode behind Nginx proxy.
- API auto‑reloads code changes.
- Postgres runs in a container with a volume.

Staging/Prod Images
-------------------
A compose file for staging is provided.

Build images locally and run:
```
# Build images
docker compose -f docker-compose.staging.yml build

# Run stack (includes DB, API, and Nginx serving built web)
docker compose -f docker-compose.staging.yml up -d

# Web: http://<server>:8080
```

Push to your registry for pull‑based deploys:
```
# Edit image names under docker-compose.staging.yml (your-registry/*)
docker compose -f docker-compose.staging.yml build
docker compose -f docker-compose.staging.yml push
```

On the server:
```
docker compose -f docker-compose.staging.yml pull
docker compose -f docker-compose.staging.yml up -d
```

Model & Embeddings
------------------
- The API uses InsightFace to download a face model at runtime automatically (no manual ONNX required).
- Face embeddings are computed only when a face is detected. Back‑of‑card documents won’t produce embeddings.

User‑centric API Endpoints
--------------------------
- POST /api/users/{user_id}/liveness-video → save video, face embed
- POST /api/users/{user_id}/document-image → save doc image, face embed (front with face)
- GET  /api/users/summary → user table data
- POST /api/users/{user_id}/match/compute → compute/update cosine match

Troubleshooting
---------------
- Uploads: Nginx allows bodies up to 50 MB.
- DB reset: `docker compose down -v` (removes volumes) then `docker compose up -d`.
- Health: `http://localhost:8080/api/health` should return `{ "ok": true }`.

