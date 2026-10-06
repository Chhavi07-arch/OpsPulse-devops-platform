from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from ..config import get_settings
from ..db import get_db
from ..schemas import Meta

router = APIRouter(tags=["system"])


@router.get("/health")
def health():
    """Liveness: the process is up and serving requests."""
    return {"status": "UP"}


@router.get("/ready")
def ready(db: Session = Depends(get_db)):
    """Readiness: the database is reachable, so this replica can take traffic."""
    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Database unavailable") from exc
    return {"status": "READY"}


@router.get("/api/meta", response_model=Meta)
def meta():
    settings = get_settings()
    return Meta(
        name=settings.app_name,
        version=settings.version,
        environment=settings.environment,
        git_sha=settings.git_sha,
    )
