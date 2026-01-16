from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import engine
from app.models import Base
from app.api import api_router
from app.api.sessions import router as sessions_router


def create_app() -> FastAPI:
    app = FastAPI()

    # CORS (local dev defaults). Adjust if needed for other environments.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.on_event("startup")
    def on_startup():
        # MVP: auto-create tables
        Base.metadata.create_all(bind=engine)

    @app.get("/health")
    def health():
        return {"ok": True}

    # Routers
    api_router.include_router(sessions_router)
    app.include_router(api_router)

    return app


app = create_app()
