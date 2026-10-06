def test_health_reports_up(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "UP"}


def test_ready_checks_database(client):
    response = client.get("/ready")
    assert response.status_code == 200
    assert response.json() == {"status": "READY"}


def test_meta_exposes_build_info(client):
    body = client.get("/api/meta").json()
    assert set(body) == {"name", "version", "environment", "git_sha"}


def test_metrics_endpoint_exposes_prometheus_format(client, incident):
    client.get("/api/incidents")
    body = client.get("/metrics").text
    assert "http_requests_total" in body
    assert 'opspulse_incidents_declared_total{severity="SEV1"}' in body
    assert 'opspulse_active_incidents{severity="SEV1"} 1.0' in body


def test_responses_carry_request_id(client):
    response = client.get("/api/services", headers={"x-request-id": "abc123"})
    assert response.headers["x-request-id"] == "abc123"
