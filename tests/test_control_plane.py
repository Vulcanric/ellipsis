from fastapi.testclient import TestClient

from services.control_plane.main import app


client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "control-plane"}


def test_missing_task_id_is_rejected_as_uuid():
    response = client.post("/v1/tasks/not-a-uuid/runs")
    assert response.status_code == 422
