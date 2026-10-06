"""Turn ORM rows into API responses, including the derived fields."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from .domain import IMPACT_BY_SEVERITY, IncidentStatus, ServiceStatus, Severity, as_utc, utcnow, worst_status
from .models import Incident, Service
from .schemas import IncidentDetail, IncidentOut, ServiceOut, TimelineOut


def active_incidents_by_service(db: Session) -> dict[int, list[Incident]]:
    rows = db.scalars(select(Incident).where(Incident.status != IncidentStatus.RESOLVED))
    grouped: dict[int, list[Incident]] = {}
    for incident in rows:
        grouped.setdefault(incident.service_id, []).append(incident)
    return grouped


def service_status(active: list[Incident]) -> ServiceStatus:
    return worst_status([IMPACT_BY_SEVERITY[Severity(i.severity)] for i in active])


def service_out(service: Service, active: list[Incident]) -> ServiceOut:
    return ServiceOut(
        id=service.id,
        name=service.name,
        description=service.description,
        team=service.team,
        tier=service.tier,
        url=service.url,
        created_at=service.created_at,
        status=service_status(active),
        active_incidents=len(active),
    )


def duration_minutes(incident: Incident) -> int:
    end = as_utc(incident.resolved_at) if incident.resolved_at else utcnow()
    return max(0, int((end - as_utc(incident.started_at)).total_seconds() // 60))


def incident_out(incident: Incident) -> IncidentOut:
    return IncidentOut(
        id=incident.id,
        title=incident.title,
        summary=incident.summary,
        severity=incident.severity,
        status=incident.status,
        commander=incident.commander,
        service_id=incident.service_id,
        service_name=incident.service.name,
        started_at=incident.started_at,
        resolved_at=incident.resolved_at,
        updated_at=incident.updated_at,
        duration_minutes=duration_minutes(incident),
    )


def incident_detail(incident: Incident) -> IncidentDetail:
    newest_first = sorted(incident.updates, key=lambda u: as_utc(u.created_at), reverse=True)
    return IncidentDetail(
        **incident_out(incident).model_dump(),
        updates=[TimelineOut.model_validate(u) for u in newest_first],
    )
