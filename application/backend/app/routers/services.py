from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import exists, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Incident, Service
from ..presenters import active_incidents_by_service, service_out
from ..schemas import ServiceCreate, ServiceOut, ServiceUpdate

router = APIRouter(prefix="/api/services", tags=["services"])


def get_service_or_404(db: Session, service_id: int) -> Service:
    service = db.get(Service, service_id)
    if service is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Service not found")
    return service


def commit_or_conflict(db: Session) -> None:
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "A service with this name already exists") from exc


@router.get("", response_model=list[ServiceOut])
def list_services(db: Session = Depends(get_db)):
    active = active_incidents_by_service(db)
    services = db.scalars(select(Service).order_by(Service.name))
    return [service_out(s, active.get(s.id, [])) for s in services]


@router.get("/{service_id}", response_model=ServiceOut)
def get_service(service_id: int, db: Session = Depends(get_db)):
    service = get_service_or_404(db, service_id)
    return service_out(service, active_incidents_by_service(db).get(service.id, []))


@router.post("", response_model=ServiceOut, status_code=status.HTTP_201_CREATED)
def create_service(payload: ServiceCreate, db: Session = Depends(get_db)):
    data = payload.model_dump()
    data["url"] = str(payload.url) if payload.url else None
    service = Service(**data)
    db.add(service)
    commit_or_conflict(db)
    return service_out(service, [])


@router.put("/{service_id}", response_model=ServiceOut)
def update_service(service_id: int, payload: ServiceUpdate, db: Session = Depends(get_db)):
    service = get_service_or_404(db, service_id)
    changes = payload.model_dump(exclude_unset=True)
    if "url" in changes:
        changes["url"] = str(payload.url) if payload.url else None
    for field, value in changes.items():
        setattr(service, field, value)
    commit_or_conflict(db)
    return service_out(service, active_incidents_by_service(db).get(service.id, []))


@router.delete("/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_service(service_id: int, db: Session = Depends(get_db)):
    service = get_service_or_404(db, service_id)
    if db.scalar(select(exists().where(Incident.service_id == service_id))):
        raise HTTPException(status.HTTP_409_CONFLICT, "Service has incident history and cannot be deleted")
    db.delete(service)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
