"""Domain vocabulary shared by the models, schemas and API."""

from datetime import UTC, datetime
from enum import StrEnum


class Severity(StrEnum):
    SEV1 = "SEV1"  # critical: full outage of a customer-facing service
    SEV2 = "SEV2"  # major: significant degradation for many users
    SEV3 = "SEV3"  # minor: partial impact, workaround exists
    SEV4 = "SEV4"  # low: cosmetic or internal-only impact


class IncidentStatus(StrEnum):
    INVESTIGATING = "INVESTIGATING"
    IDENTIFIED = "IDENTIFIED"
    MONITORING = "MONITORING"
    RESOLVED = "RESOLVED"


class ServiceTier(StrEnum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    STANDARD = "STANDARD"


class ServiceStatus(StrEnum):
    OPERATIONAL = "OPERATIONAL"
    DEGRADED = "DEGRADED"
    PARTIAL_OUTAGE = "PARTIAL_OUTAGE"
    MAJOR_OUTAGE = "MAJOR_OUTAGE"


IMPACT_BY_SEVERITY: dict[Severity, ServiceStatus] = {
    Severity.SEV1: ServiceStatus.MAJOR_OUTAGE,
    Severity.SEV2: ServiceStatus.PARTIAL_OUTAGE,
    Severity.SEV3: ServiceStatus.DEGRADED,
    Severity.SEV4: ServiceStatus.DEGRADED,
}

STATUS_RANK: dict[ServiceStatus, int] = {status: rank for rank, status in enumerate(ServiceStatus)}


def worst_status(statuses: list[ServiceStatus]) -> ServiceStatus:
    return max(statuses, key=STATUS_RANK.__getitem__, default=ServiceStatus.OPERATIONAL)


def utcnow() -> datetime:
    return datetime.now(UTC)


def as_utc(value: datetime) -> datetime:
    """SQLite drops tzinfo on round-trip; treat naive timestamps as UTC."""
    return value if value.tzinfo else value.replace(tzinfo=UTC)
