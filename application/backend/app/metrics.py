"""Business metrics for Prometheus, on top of the HTTP metrics from the instrumentator."""

import logging
from collections.abc import Iterator

from prometheus_client import REGISTRY, Counter, Histogram
from prometheus_client.core import GaugeMetricFamily
from prometheus_client.registry import Collector
from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError

from .db import get_sessionmaker
from .domain import IncidentStatus, Severity
from .models import Incident

log = logging.getLogger(__name__)

INCIDENTS_DECLARED = Counter("opspulse_incidents_declared_total", "Incidents declared through the API", ["severity"])
INCIDENTS_RESOLVED = Counter(
    "opspulse_incidents_resolved_total", "Incidents moved to RESOLVED through the API", ["severity"]
)
TIME_TO_RESOLVE = Histogram(
    "opspulse_incident_resolution_seconds",
    "Time from incident start to resolution",
    ["severity"],
    buckets=(300, 900, 1800, 3600, 7200, 14400, 43200, 86400, 259200),
)


class ActiveIncidentsCollector(Collector):
    """Reads open incidents from the database at scrape time, so every replica reports the true value."""

    @staticmethod
    def _family() -> GaugeMetricFamily:
        return GaugeMetricFamily("opspulse_active_incidents", "Incidents that are not resolved", labels=["severity"])

    def describe(self) -> Iterator[GaugeMetricFamily]:
        # Lets the registry learn the metric name without querying the database at import time.
        yield self._family()

    def collect(self) -> Iterator[GaugeMetricFamily]:
        gauge = self._family()
        try:
            with get_sessionmaker()() as db:
                rows = dict(
                    db.execute(
                        select(Incident.severity, func.count(Incident.id))
                        .where(Incident.status != IncidentStatus.RESOLVED)
                        .group_by(Incident.severity)
                    ).all()
                )
        except SQLAlchemyError:
            log.warning("could not read active incidents for metrics", exc_info=True)
            return
        for severity in Severity:
            gauge.add_metric([severity], rows.get(severity, 0))
        yield gauge


REGISTRY.register(ActiveIncidentsCollector())
