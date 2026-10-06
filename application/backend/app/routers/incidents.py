import logging

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from ..db import get_db
from ..domain import IncidentStatus, Severity, as_utc, utcnow
from ..metrics import INCIDENTS_DECLARED, INCIDENTS_RESOLVED, TIME_TO_RESOLVE
from ..models import Incident, IncidentUpdate, Service
from ..presenters import incident_detail, incident_out
from ..schemas import IncidentCreate, IncidentDetail, IncidentOut, IncidentUpdatePatch, TimelineCreate

router = APIRouter(prefix="/api/incidents", tags=["incidents"])
log = logging.getLogger(__name__)


def get_incident_or_404(db: Session, incident_id: int) -> Incident:
    incident = db.get(Incident, incident_id, options=[selectinload(Incident.service), selectinload(Incident.updates)])
    if incident is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Incident not found")
    return incident


@router.get("", response_model=list[IncidentOut])
def list_incidents(
    db: Session = Depends(get_db),
    status_: IncidentStatus | None = Query(default=None, alias="status"),
    severity: Severity | None = None,
    service_id: int | None = None,
    active: bool | None = Query(default=None, description="true = not resolved, false = resolved"),
    q: str | None = Query(default=None, max_length=100, description="Search title and summary"),
    limit: int = Query(default=100, ge=1, le=500),
):
    query = select(Incident).options(selectinload(Incident.service))
    if status_ is not None:
        query = query.where(Incident.status == status_)
    if severity is not None:
        query = query.where(Incident.severity == severity)
    if service_id is not None:
        query = query.where(Incident.service_id == service_id)
    if active is not None:
        resolved = Incident.status == IncidentStatus.RESOLVED
        query = query.where(~resolved if active else resolved)
    if q:
        pattern = f"%{q}%"
        query = query.where(or_(Incident.title.ilike(pattern), Incident.summary.ilike(pattern)))
    incidents = db.scalars(query.order_by(Incident.started_at.desc()).limit(limit))
    return [incident_out(i) for i in incidents]


@router.get("/{incident_id}", response_model=IncidentDetail)
def get_incident(incident_id: int, db: Session = Depends(get_db)):
    return incident_detail(get_incident_or_404(db, incident_id))


@router.post("", response_model=IncidentDetail, status_code=status.HTTP_201_CREATED)
def declare_incident(payload: IncidentCreate, db: Session = Depends(get_db)):
    if db.get(Service, payload.service_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Service not found")
    incident = Incident(
        title=payload.title,
        summary=payload.summary,
        severity=payload.severity,
        status=IncidentStatus.INVESTIGATING,
        commander=payload.commander,
        service_id=payload.service_id,
    )
    incident.updates.append(
        IncidentUpdate(status=IncidentStatus.INVESTIGATING, message=payload.message, author=payload.commander)
    )
    db.add(incident)
    db.commit()
    INCIDENTS_DECLARED.labels(severity=incident.severity).inc()
    log.info("incident declared", extra={"incident_id": incident.id, "severity": incident.severity})
    return incident_detail(get_incident_or_404(db, incident.id))


@router.put("/{incident_id}", response_model=IncidentDetail)
def update_incident(incident_id: int, payload: IncidentUpdatePatch, db: Session = Depends(get_db)):
    incident = get_incident_or_404(db, incident_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(incident, field, value)
    db.commit()
    return incident_detail(get_incident_or_404(db, incident_id))


@router.post("/{incident_id}/updates", response_model=IncidentDetail, status_code=status.HTTP_201_CREATED)
def post_timeline_update(incident_id: int, payload: TimelineCreate, db: Session = Depends(get_db)):
    incident = get_incident_or_404(db, incident_id)
    was_resolved = incident.status == IncidentStatus.RESOLVED
    now = utcnow()

    incident.status = payload.status
    incident.updates.append(IncidentUpdate(status=payload.status, message=payload.message, author=payload.author))
    if payload.status == IncidentStatus.RESOLVED and not was_resolved:
        incident.resolved_at = now
        INCIDENTS_RESOLVED.labels(severity=incident.severity).inc()
        TIME_TO_RESOLVE.labels(severity=incident.severity).observe((now - as_utc(incident.started_at)).total_seconds())
    elif payload.status != IncidentStatus.RESOLVED and was_resolved:
        incident.resolved_at = None  # reopened
    db.commit()
    log.info("incident updated", extra={"incident_id": incident.id, "status": incident.status})
    return incident_detail(get_incident_or_404(db, incident_id))


@router.delete("/{incident_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_incident(incident_id: int, db: Session = Depends(get_db)):
    db.delete(get_incident_or_404(db, incident_id))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
