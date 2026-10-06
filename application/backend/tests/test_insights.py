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
