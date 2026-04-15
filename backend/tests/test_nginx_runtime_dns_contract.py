from pathlib import Path


def test_docker_nginx_uses_open_source_compatible_upstreams():
    source = Path("docker/nginx/nginx.conf").read_text(encoding="utf-8")

    assert "zone gateway 64k;" not in source
    assert "server gateway:8001 resolve;" not in source
    assert "server gateway:8001;" in source
    assert "zone langgraph 64k;" not in source
    assert "server langgraph:2024 resolve;" not in source
    assert "server langgraph:2024;" in source
    assert "zone frontend 64k;" not in source
    assert "server frontend:3000 resolve;" not in source
    assert "server frontend:3000;" in source
