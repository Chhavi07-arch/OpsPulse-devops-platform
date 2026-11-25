from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.spa import SPAFiles


def test_browser_routes_reload_without_masking_missing_api_or_assets(tmp_path):
    (tmp_path / "index.html").write_text("<html>OpsPulse test frontend</html>")
    (tmp_path / "assets").mkdir()
    (tmp_path / "assets" / "app.js").write_text("console.log('test');")
    app = FastAPI()
    app.mount("/", SPAFiles(directory=tmp_path, html=True))
    with TestClient(app) as client:
        for path in ["/", "/incidents", "/incidents/42", "/services", "/status"]:
            response = client.get(path)
            assert response.status_code == 200
            assert "OpsPulse test frontend" in response.text
        assert client.get("/assets/app.js").status_code == 200
        for path in ["/api/unknown", "/assets/missing.js", "/missing.css", "/ready/unknown"]:
            assert client.get(path).status_code == 404
        assert client.post("/incidents").status_code == 405
