import os

# Tests run against an isolated in-memory SQLite database, never a real Postgres.
os.environ["OPSPULSE_DATABASE_URL"] = "sqlite+pysqlite:///:memory:"
os.environ["OPSPULSE_SEED_DEMO_DATA"] = "false"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.db import Base, get_engine  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture
def client():
    Base.metadata.create_all(get_engine())
    with TestClient(app) as test_client:
        yield test_client
    Base.metadata.drop_all(get_engine())


@pytest.fixture
def service(client):
    response = client.post(
        "/api/services",
        json={"name": "Checkout API", "team": "Payments", "tier": "CRITICAL", "description": "Payments"},
    )
    assert response.status_code == 201
    return response.json()


@pytest.fixture
def incident(client, service):
    response = client.post(
        "/api/incidents",
        json={
            "title": "Card payments failing",
            "severity": "SEV1",
            "service_id": service["id"],
            "commander": "Asha (on-call)",
        },
    )
    assert response.status_code == 201
    return response.json()
