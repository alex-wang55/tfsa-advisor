import importlib

from fastapi.testclient import TestClient

import app.main as main


def _preflight(client: TestClient, origin: str):
    return client.options(
        "/api/health",
        headers={"Origin": origin, "Access-Control-Request-Method": "GET"},
    )


def test_local_frontend_is_allowed_by_default():
    res = _preflight(TestClient(main.app), "http://localhost:5173")
    assert res.headers.get("access-control-allow-origin") == "http://localhost:5173"


def test_unknown_origin_is_rejected():
    res = _preflight(TestClient(main.app), "https://not-my-site.example")
    assert "access-control-allow-origin" not in res.headers


def test_allowed_origins_come_from_env(monkeypatch):
    monkeypatch.setenv("ALLOWED_ORIGINS", "https://a.example, https://b.example,")
    try:
        reloaded = importlib.reload(main)
        assert reloaded.ALLOWED_ORIGINS == ["https://a.example", "https://b.example"]
        res = _preflight(TestClient(reloaded.app), "https://b.example")
        assert res.headers.get("access-control-allow-origin") == "https://b.example"
    finally:
        monkeypatch.delenv("ALLOWED_ORIGINS")
        importlib.reload(main)
