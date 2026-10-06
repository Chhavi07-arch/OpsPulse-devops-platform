def test_create_and_list_services(client, service):
    services = client.get("/api/services").json()
    assert [s["name"] for s in services] == ["Checkout API"]
    assert services[0]["status"] == "OPERATIONAL"
    assert services[0]["active_incidents"] == 0


def test_get_service_by_id(client, service):
    response = client.get(f"/api/services/{service['id']}")
    assert response.status_code == 200
    assert response.json()["team"] == "Payments"


def test_get_missing_service_returns_404(client):
    assert client.get("/api/services/999").status_code == 404


def test_duplicate_service_name_is_rejected(client, service):
    response = client.post("/api/services", json={"name": "Checkout API", "team": "Other"})
    assert response.status_code == 409


def test_invalid_service_payload_is_rejected(client):
    response = client.post("/api/services", json={"name": "x", "team": "Payments", "tier": "GOLD"})
    assert response.status_code == 422


def test_update_service(client, service):
    response = client.put(f"/api/services/{service['id']}", json={"tier": "HIGH", "url": "https://status.example.com"})
    assert response.status_code == 200
    assert response.json()["tier"] == "HIGH"
    assert response.json()["url"] == "https://status.example.com/"


def test_delete_unused_service(client, service):
    assert client.delete(f"/api/services/{service['id']}").status_code == 204
    assert client.get(f"/api/services/{service['id']}").status_code == 404


def test_service_with_incident_history_cannot_be_deleted(client, service, incident):
    assert client.delete(f"/api/services/{service['id']}").status_code == 409


def test_service_status_reflects_worst_active_incident(client, service, incident):
    assert client.get(f"/api/services/{service['id']}").json()["status"] == "MAJOR_OUTAGE"
