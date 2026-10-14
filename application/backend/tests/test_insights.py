from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from app.db import get_engine
from app.models import Incident


def test_stats_counts_active_incidents_and_services(client, incident):
    stats = client.get("/api/stats").json()
    assert stats["active_incidents"] == 1
    assert stats["active_by_severity"]["SEV1"] == 1
    assert stats["services_total"] == 1
    assert stats["services_operational"] == 0
    assert len(stats["trend"]) == 14
    assert stats["trend"][-1]["opened"] == 1


def test_stats_mttr_after_resolution(client, incident):
    client.post(
        f"/api/incidents/{incident['id']}/updates",
        json={"status": "RESOLVED", "message": "Fixed", "author": "Asha"},
    )
    stats = client.get("/api/stats").json()
    assert stats["resolved_last_30d"] == 1
    assert stats["mttr_minutes"] == 0
    assert stats["services_operational"] == 1


def test_stats_rejects_out_of_range_window(client):
    assert client.get("/api/stats", params={"days": 365}).status_code == 422


def test_status_page_shows_outage_and_history(client, incident):
    page = client.get("/api/status", params={"days": 7}).json()
    assert page["overall"] == "MAJOR_OUTAGE"
    assert len(page["active_incidents"]) == 1
    service = page["services"][0]
    assert len(service["history"]) == 7
    assert service["history"][-1]["status"] == "MAJOR_OUTAGE"
    assert service["uptime_percent"] <= 100


def test_status_page_all_operational_without_incidents(client, service):
    page = client.get("/api/status").json()
    assert page["overall"] == "OPERATIONAL"
    assert page["services"][0]["uptime_percent"] == 100.0


def test_status_uptime_counts_overlapping_outages_once(client, service, monkeypatch):
    now = datetime(2026, 10, 14, 12, tzinfo=UTC)
    monkeypatch.setattr("app.routers.insights.utcnow", lambda: now)
    # The first incident crosses the window boundary; the second overlaps it
    # and the third is contained within it. A minor degradation is not downtime.
    with Session(get_engine()) as db:
        for start_days, end_days, severity in [(8, 2, "SEV1"), (4, 1, "SEV2"), (3, 2, "SEV1"), (1, 0, "SEV3")]:
            db.add(
                Incident(
                    title="Concurrent outage",
                    service_id=service["id"],
                    commander="On-call",
                    severity=severity,
                    status="RESOLVED",
                    started_at=now - timedelta(days=start_days),
                    resolved_at=now - timedelta(days=end_days),
                )
            )
        db.commit()
    response = client.get("/api/status", params={"days": 7})
    assert response.status_code == 200
    # The window is 6.5 days; its final day has no outage.
    assert response.json()["services"][0]["uptime_percent"] == round(100 / 6.5, 2)


def test_status_uptime_never_negative_for_concurrent_open_outages(client, service, monkeypatch):
    now = datetime(2026, 10, 14, 12, tzinfo=UTC)
    monkeypatch.setattr("app.routers.insights.utcnow", lambda: now)
    with Session(get_engine()) as db:
        for _ in range(2):
            db.add(
                Incident(
                    title="Ongoing outage",
                    service_id=service["id"],
                    commander="On-call",
                    severity="SEV1",
                    status="INVESTIGATING",
                    started_at=now - timedelta(days=10),
                )
            )
        db.commit()
    assert client.get("/api/status", params={"days": 7}).json()["services"][0]["uptime_percent"] == 0
