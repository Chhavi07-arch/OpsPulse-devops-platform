from datetime import UTC, date, datetime, time, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from ..db import get_db
from ..domain import IMPACT_BY_SEVERITY, IncidentStatus, ServiceStatus, Severity, as_utc, utcnow, worst_status
from ..models import Incident, Service
from ..presenters import (
    active_incidents_by_service,
    duration_minutes,
    incident_detail,
    incident_out,
    service_status,
)
from ..schemas import Stats, StatusPage, StatusPageService, TrendPoint, UptimeDay

router = APIRouter(prefix="/api", tags=["insights"])

MTTR_WINDOW = timedelta(days=30)
RECENTLY_RESOLVED_WINDOW = timedelta(days=7)
OUTAGE_STATUSES = {ServiceStatus.MAJOR_OUTAGE, ServiceStatus.PARTIAL_OUTAGE}


def day_start(day: date) -> datetime:
    return datetime.combine(day, time.min, tzinfo=UTC)


def overlap_seconds(incident: Incident, start: datetime, end: datetime) -> float:
    inc_start = as_utc(incident.started_at)
    inc_end = as_utc(incident.resolved_at) if incident.resolved_at else utcnow()
    return max(0.0, (min(inc_end, end) - max(inc_start, start)).total_seconds())


@router.get("/stats", response_model=Stats)
def stats(db: Session = Depends(get_db), days: int = Query(default=14, ge=7, le=90)):
    now = utcnow()
    active = db.scalars(select(Incident).where(Incident.status != IncidentStatus.RESOLVED)).all()
    by_severity = {severity: 0 for severity in Severity}
    for incident in active:
        by_severity[Severity(incident.severity)] += 1

    resolved = db.scalars(select(Incident).where(Incident.resolved_at >= now - MTTR_WINDOW)).all()
    mttr = round(sum(duration_minutes(i) for i in resolved) / len(resolved)) if resolved else None

    services_total = len(db.scalars(select(Service.id)).all())
    services_impacted = len({i.service_id for i in active})

    first_day = now.date() - timedelta(days=days - 1)
    window = day_start(first_day)
    opened: dict[date, int] = {}
    closed: dict[date, int] = {}
    for incident in db.scalars(select(Incident).where(Incident.started_at >= window)):
        opened[as_utc(incident.started_at).date()] = opened.get(as_utc(incident.started_at).date(), 0) + 1
    for incident in db.scalars(select(Incident).where(Incident.resolved_at >= window)):
        closed[as_utc(incident.resolved_at).date()] = closed.get(as_utc(incident.resolved_at).date(), 0) + 1
    trend = [
        TrendPoint(day=d, opened=opened.get(d, 0), resolved=closed.get(d, 0))
        for d in (first_day + timedelta(days=n) for n in range(days))
    ]

    return Stats(
        active_incidents=len(active),
        active_by_severity=by_severity,
        resolved_last_30d=len(resolved),
        mttr_minutes=mttr,
        services_total=services_total,
        services_operational=services_total - services_impacted,
        trend=trend,
    )


@router.get("/status", response_model=StatusPage)
def status_page(db: Session = Depends(get_db), days: int = Query(default=30, ge=7, le=90)):
    now = utcnow()
    first_day = now.date() - timedelta(days=days - 1)
    window = day_start(first_day)

    services = db.scalars(select(Service).order_by(Service.name)).all()
    active = active_incidents_by_service(db)
    in_window = db.scalars(
        select(Incident)
        .options(selectinload(Incident.service), selectinload(Incident.updates))
        .where(Incident.started_at <= now)
        .where(or_(Incident.resolved_at.is_(None), Incident.resolved_at >= window))
    ).all()

    page_services = []
    for service in services:
        incidents = [i for i in in_window if i.service_id == service.id]
        history = []
        for n in range(days):
            start = day_start(first_day + timedelta(days=n))
            end = start + timedelta(days=1)
            impacts = [
                IMPACT_BY_SEVERITY[Severity(i.severity)] for i in incidents if overlap_seconds(i, start, end) > 0
            ]
            history.append(UptimeDay(day=start.date(), status=worst_status(impacts)))
        outage = sum(
            overlap_seconds(i, window, now)
            for i in incidents
            if IMPACT_BY_SEVERITY[Severity(i.severity)] in OUTAGE_STATUSES
        )
        uptime = 100 * (1 - outage / (now - window).total_seconds())
        page_services.append(
            StatusPageService(
                id=service.id,
                name=service.name,
                tier=service.tier,
                status=service_status(active.get(service.id, [])),
                uptime_percent=round(uptime, 2),
                history=history,
            )
        )

    open_incidents = sorted(
        (i for i in in_window if i.status != IncidentStatus.RESOLVED),
        key=lambda i: (i.severity, -as_utc(i.started_at).timestamp()),
    )
    recently_resolved = sorted(
        (i for i in in_window if i.resolved_at and as_utc(i.resolved_at) >= now - RECENTLY_RESOLVED_WINDOW),
        key=lambda i: as_utc(i.resolved_at),
        reverse=True,
    )

    return StatusPage(
        overall=worst_status([s.status for s in page_services]),
        generated_at=now,
        services=page_services,
        active_incidents=[incident_detail(i) for i in open_incidents],
        recently_resolved=[incident_out(i) for i in recently_resolved[:10]],
    )
