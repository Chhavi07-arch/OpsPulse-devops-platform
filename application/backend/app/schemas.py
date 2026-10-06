from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, HttpUrl

from .domain import IncidentStatus, ServiceStatus, ServiceTier, Severity

Name = Field(min_length=2, max_length=80)


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# --- Services -------------------------------------------------------------


class ServiceCreate(BaseModel):
    name: str = Name
    description: str = Field(default="", max_length=300)
    team: str = Name
    tier: ServiceTier = ServiceTier.STANDARD
    url: HttpUrl | None = None


class ServiceUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=80)
    description: str | None = Field(default=None, max_length=300)
    team: str | None = Field(default=None, min_length=2, max_length=80)
    tier: ServiceTier | None = None
    url: HttpUrl | None = None


class ServiceOut(ORMModel):
    id: int
    name: str
    description: str
    team: str
    tier: ServiceTier
    url: str | None
    created_at: datetime
    status: ServiceStatus
    active_incidents: int


# --- Incidents ------------------------------------------------------------


class IncidentCreate(BaseModel):
    title: str = Field(min_length=4, max_length=160)
    summary: str = Field(default="", max_length=2000)
    severity: Severity
    service_id: int
    commander: str = Name
    message: str = Field(default="We are investigating reports of an issue.", min_length=1, max_length=2000)


class IncidentUpdatePatch(BaseModel):
    """Edits incident details. Status changes go through the timeline so they are always audited."""

    title: str | None = Field(default=None, min_length=4, max_length=160)
    summary: str | None = Field(default=None, max_length=2000)
    severity: Severity | None = None
    commander: str | None = Field(default=None, min_length=2, max_length=80)


class TimelineCreate(BaseModel):
    status: IncidentStatus
    message: str = Field(min_length=1, max_length=2000)
    author: str = Name


class TimelineOut(ORMModel):
    id: int
    status: IncidentStatus
    message: str
    author: str
    created_at: datetime


class IncidentOut(ORMModel):
    id: int
    title: str
    summary: str
    severity: Severity
    status: IncidentStatus
    commander: str
    service_id: int
    service_name: str
    started_at: datetime
    resolved_at: datetime | None
    updated_at: datetime
    duration_minutes: int


class IncidentDetail(IncidentOut):
    updates: list[TimelineOut]


# --- Insights -------------------------------------------------------------


class TrendPoint(BaseModel):
    day: date
    opened: int
    resolved: int


class Stats(BaseModel):
    active_incidents: int
    active_by_severity: dict[Severity, int]
    resolved_last_30d: int
    mttr_minutes: int | None
    services_total: int
    services_operational: int
    trend: list[TrendPoint]


class UptimeDay(BaseModel):
    day: date
    status: ServiceStatus


class StatusPageService(BaseModel):
    id: int
    name: str
    tier: ServiceTier
    status: ServiceStatus
    uptime_percent: float
    history: list[UptimeDay]


class StatusPage(BaseModel):
    overall: ServiceStatus
    generated_at: datetime
    services: list[StatusPageService]
    active_incidents: list[IncidentDetail]
    recently_resolved: list[IncidentOut]


class Meta(BaseModel):
    name: str
    version: str
    environment: str
    git_sha: str
