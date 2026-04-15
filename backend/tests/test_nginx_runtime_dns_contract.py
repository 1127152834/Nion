from pathlib import Path


def test_docker_nginx_re_resolves_runtime_upstreams():
    source = Path("docker/nginx/nginx.conf").read_text(encoding="utf-8")

    assert "zone gateway 64k;" in source
    assert "server gateway:8001 resolve;" in source
    assert "zone langgraph 64k;" in source
    assert "server langgraph:2024 resolve;" in source
    assert "zone frontend 64k;" in source
    assert "server frontend:3000 resolve;" in source
