def test_declare_incident_starts_investigating_with_timeline(incident):
    assert incident["status"] == "INVESTIGATING"
    assert incident["service_name"] == "Checkout API"
    assert len(incident["updates"]) == 1
    assert incident["updates"][0]["author"] == "Asha (on-call)"


def test_declare_incident_for_unknown_service_returns_404(client):
    response = client.post(
        "/api/incidents",
        json={"title": "Ghost incident", "severity": "SEV2", "service_id": 42, "commander": "Asha"},
    )
    assert response.status_code == 404


def test_list_incidents_with_filters(client, incident):
    assert len(client.get("/api/incidents", params={"severity": "SEV1"}).json()) == 1
    assert client.get("/api/incidents", params={"severity": "SEV3"}).json() == []
    assert len(client.get("/api/incidents", params={"active": "true"}).json()) == 1
    assert len(client.get("/api/incidents", params={"q": "payments"}).json()) == 1


def test_get_incident_detail(client, incident):
    response = client.get(f"/api/incidents/{incident['id']}")
    assert response.status_code == 200
    assert response.json()["title"] == "Card payments failing"


def test_update_incident_details(client, incident):
    response = client.put(f"/api/incidents/{incident['id']}", json={"severity": "SEV2"})
    assert response.status_code == 200
    assert response.json()["severity"] == "SEV2"
    assert response.json()["status"] == "INVESTIGATING"


def test_timeline_update_moves_status_and_resolves(client, incident):
    url = f"/api/incidents/{incident['id']}/updates"
    client.post(url, json={"status": "IDENTIFIED", "message": "Expired certificate", "author": "Asha"})
    resolved = client.post(url, json={"status": "RESOLVED", "message": "Rotated", "author": "Asha"}).json()

    assert resolved["status"] == "RESOLVED"
    assert resolved["resolved_at"] is not None
    assert [u["status"] for u in resolved["updates"]] == ["RESOLVED", "IDENTIFIED", "INVESTIGATING"]
    assert client.get("/api/services").json()[0]["status"] == "OPERATIONAL"


def test_reopening_clears_resolved_at(client, incident):
    url = f"/api/incidents/{incident['id']}/updates"
    client.post(url, json={"status": "RESOLVED", "message": "Fixed", "author": "Asha"})
    reopened = client.post(url, json={"status": "INVESTIGATING", "message": "Back again", "author": "Asha"})
    assert reopened.json()["resolved_at"] is None


def test_invalid_timeline_status_is_rejected(client, incident):
    response = client.post(
        f"/api/incidents/{incident['id']}/updates",
        json={"status": "PANICKING", "message": "?", "author": "Asha"},
    )
    assert response.status_code == 422


def test_delete_incident(client, incident):
    assert client.delete(f"/api/incidents/{incident['id']}").status_code == 204
    assert client.get(f"/api/incidents/{incident['id']}").status_code == 404
