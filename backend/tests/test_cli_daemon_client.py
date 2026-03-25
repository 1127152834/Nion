from nion.cli.daemon_client import build_threads_base_url


def test_build_threads_base_url_joins_daemon_host_and_threads_route() -> None:
    assert build_threads_base_url("http://127.0.0.1:43115") == "http://127.0.0.1:43115/api/threads"
