import logging
import time
import uuid
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator

from .config import get_settings
from .logging_config import configure_logging
from .routers import incidents, insights, services, system
from .seed import seed_demo_data

settings = get_settings()
configure_logging(settings.log_level)
log = logging.getLogger("opspulse")

QUIET_PATHS = {"/health", "/ready", "/metrics"}


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    log.info("starting", extra={"version": settings.version, "git_sha": settings.git_sha})
    if settings.seed_demo_data:
        seed_demo_data()
    yield


app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description="Incident management and public status page API.",
    lifespan=lifespan,
)

if settings.cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["GET", "POST", "PUT", "DELETE"],
        allow_headers=["Content-Type"],
    )


@app.middleware("http")
async def request_logging(request: Request, call_next):
    request_id = request.headers.get("x-request-id") or uuid.uuid4().hex
    start = time.perf_counter()
    response = await call_next(request)
    response.headers["x-request-id"] = request_id
    if request.url.path not in QUIET_PATHS:
        log.info(
            "request",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status": response.status_code,
                "duration_ms": round((time.perf_counter() - start) * 1000, 1),
            },
        )
    return response


app.include_router(system.router)
app.include_router(services.router)
app.include_router(incidents.router)
app.include_router(insights.router)

Instrumentator(excluded_handlers=list(QUIET_PATHS), should_group_status_codes=False).instrument(app).expose(
    app, include_in_schema=False
)
