"""Optional demo data (OPSPULSE_SEED_DEMO_DATA=true) so a fresh install has a realistic dashboard."""

import logging
from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from .db import get_sessionmaker
from .domain import IncidentStatus, ServiceTier, Severity, utcnow
from .models import Incident, IncidentUpdate, Service

log = logging.getLogger(__name__)

SERVICES = [
    ("Checkout API", "Cart, pricing and payment orchestration", "Payments", ServiceTier.CRITICAL),
    ("Auth Service", "Login, sessions and token issuance", "Identity", ServiceTier.CRITICAL),
    ("Web Storefront", "Customer-facing web application", "Frontend", ServiceTier.CRITICAL),
    ("Search", "Product search and autocomplete", "Discovery", ServiceTier.HIGH),
    ("Data Pipeline", "Event ingestion and analytics jobs", "Platform", ServiceTier.HIGH),
    ("Notifications", "Email, SMS and push delivery", "Messaging", ServiceTier.STANDARD),
]

# (service, severity, title, started N hours ago, minutes until resolved or None if still open, timeline)
INCIDENTS = [
    (
        "Checkout API",
        Severity.SEV1,
        "Payment authorisations failing for card payments",
        310,
        47,
        [
            (IncidentStatus.INVESTIGATING, "Card payments are failing at authorisation. Paging payments on-call."),
            (IncidentStatus.IDENTIFIED, "Expired TLS certificate on the payment gateway client. Rotating now."),
            (IncidentStatus.MONITORING, "Certificate rotated, authorisation success rate back to 99.8%."),
            (IncidentStatus.RESOLVED, "Stable for 30 minutes. Added certificate expiry alerting."),
        ],
    ),
    (
        "Search",
        Severity.SEV3,
        "Autocomplete suggestions slow in EU",
        260,
        95,
        [
            (IncidentStatus.INVESTIGATING, "p95 autocomplete latency at 2.4s for EU users."),
            (IncidentStatus.IDENTIFIED, "One EU search node has a hot shard after reindexing."),
            (IncidentStatus.RESOLVED, "Shards rebalanced, latency back under 200ms."),
        ],
    ),
    (
        "Auth Service",
        Severity.SEV2,
        "Elevated login errors after deploy",
        220,
        32,
        [
            (IncidentStatus.INVESTIGATING, "5xx rate on /login jumped to 12% right after release 4.2.0."),
            (IncidentStatus.IDENTIFIED, "Session store connection pool too small in the new config."),
            (IncidentStatus.RESOLVED, "Rolled back to 4.1.3 with helm rollback; errors cleared."),
        ],
    ),
    (
        "Notifications",
        Severity.SEV4,
        "Delayed marketing emails",
        190,
        180,
        [
            (IncidentStatus.INVESTIGATING, "Marketing email queue backlog of 40k messages."),
            (IncidentStatus.RESOLVED, "Queue drained after scaling workers from 2 to 6."),
        ],
    ),
    (
        "Data Pipeline",
        Severity.SEV3,
        "Analytics dashboards showing stale data",
        150,
        240,
        [
            (IncidentStatus.INVESTIGATING, "Dashboards last updated 3 hours ago."),
            (IncidentStatus.IDENTIFIED, "Ingestion job OOMKilled; memory limit too low for peak volume."),
            (IncidentStatus.MONITORING, "Raised the memory limit, backfill running."),
            (IncidentStatus.RESOLVED, "Backfill complete, dashboards current."),
        ],
    ),
    (
        "Web Storefront",
        Severity.SEV2,
        "Product images not loading",
        120,
        28,
        [
            (IncidentStatus.INVESTIGATING, "Broken images on product pages across all regions."),
            (IncidentStatus.IDENTIFIED, "CDN origin pointed at a deleted bucket after a config change."),
            (IncidentStatus.RESOLVED, "Origin restored; config change reverted through GitOps."),
        ],
    ),
    (
        "Checkout API",
        Severity.SEV3,
        "Discount codes rejected intermittently",
        80,
        65,
        [
            (IncidentStatus.INVESTIGATING, "~5% of valid discount codes return 'invalid'."),
            (IncidentStatus.IDENTIFIED, "Cache TTL mismatch between pricing replicas."),
            (IncidentStatus.RESOLVED, "Cache invalidation fixed and deployed."),
        ],
    ),
    (
        "Auth Service",
        Severity.SEV4,
        "Password reset emails delayed",
        50,
        40,
        [
            (IncidentStatus.INVESTIGATING, "Reset emails arriving 10+ minutes late."),
            (IncidentStatus.RESOLVED, "Notification provider recovered."),
        ],
    ),
    (
        "Search",
        Severity.SEV2,
        "Search returning empty results",
        26,
        55,
        [
            (IncidentStatus.INVESTIGATING, "Search returns zero results for most queries."),
            (IncidentStatus.IDENTIFIED, "Index alias swapped to an empty index by a failed job."),
            (IncidentStatus.MONITORING, "Alias pointed back to the previous index."),
            (IncidentStatus.RESOLVED, "Results normal; added a guard to the reindex job."),
        ],
    ),
    (
        "Data Pipeline",
        Severity.SEV2,
        "Event ingestion lagging behind",
        3,
        None,
        [
            (IncidentStatus.INVESTIGATING, "Kafka consumer lag above 2M events and growing."),
            (IncidentStatus.IDENTIFIED, "A poison message is crashing one consumer group; skipping it."),
        ],
    ),
    (
        "Notifications",
        Severity.SEV3,
        "SMS delivery degraded for some carriers",
        1,
        None,
        [
            (IncidentStatus.INVESTIGATING, "Delivery receipts missing for two carriers."),
        ],
    ),
]


def seed_demo_data() -> None:
    with get_sessionmaker()() as db:
        if db.scalar(select(Service.id).limit(1)) is not None:
            return
        now = utcnow()
        services = {
            name: Service(name=name, description=desc, team=team, tier=tier) for name, desc, team, tier in SERVICES
        }
        db.add_all(services.values())
        for service, severity, title, hours_ago, minutes, timeline in INCIDENTS:
            started = now - timedelta(hours=hours_ago)
            commander = f"{services[service].team} on-call"
            incident = Incident(
                title=title,
                severity=severity,
                status=timeline[-1][0],
                commander=commander,
                service=services[service],
                started_at=started,
                resolved_at=started + timedelta(minutes=minutes) if minutes is not None else None,
            )
            span = minutes if minutes is not None else hours_ago * 60
            step = span / len(timeline)
            for n, (status, message) in enumerate(timeline):
                incident.updates.append(
                    IncidentUpdate(
                        status=status,
                        message=message,
                        author=commander,
                        created_at=started + timedelta(minutes=round(n * step)),
                    )
                )
            db.add(incident)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()  # another replica seeded at the same moment
            return
        log.info("demo data seeded", extra={"services": len(SERVICES), "incidents": len(INCIDENTS)})
