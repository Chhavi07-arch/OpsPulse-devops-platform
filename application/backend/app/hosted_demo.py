"""Single-origin, disposable public demo. The normal app.main entrypoint is unchanged."""

import os
from contextlib import asynccontextmanager
from pathlib import Path

from .config import get_settings
from .db import Base, get_engine
from .main import app
from .spa import SPAFiles

settings = get_settings()
if settings.environment != "hosted-demo" or not str(settings.sqlalchemy_url).startswith("sqlite"):
    raise RuntimeError("The public demo requires hosted-demo mode and a disposable SQLite database")

frontend = Path(os.environ.get("OPSPULSE_STATIC_DIRECTORY", "/app/frontend"))
if not (frontend / "index.html").is_file():
    raise RuntimeError("Build the React frontend before starting the hosted demo")

application_lifespan = app.router.lifespan_context


@asynccontextmanager
async def demo_lifespan(instance):
    # This entrypoint is intentionally restricted to disposable demo data. The
    # PostgreSQL/Kubernetes entrypoint continues to use its Alembic migrations.
    Base.metadata.create_all(get_engine())
    async with application_lifespan(instance):
        yield


app.router.lifespan_context = demo_lifespan
app.mount("/", SPAFiles(directory=frontend, html=True), name="frontend")
