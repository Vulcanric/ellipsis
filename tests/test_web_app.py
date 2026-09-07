from pathlib import Path


def test_next_app_has_app_router_entrypoint():
    page = Path("web/app/page.tsx").read_text()
    assert '"use client"' in page
    assert "useQuery" in page
    assert "/v1/tasks" in page


def test_compose_defines_required_services():
    compose = Path("docker-compose.yml").read_text()
    for service in ("postgres:", "redis:", "api:", "worker:", "web:"):
        assert service in compose
