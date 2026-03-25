from __future__ import annotations

import uvicorn

from app.daemon.app import create_app
from nion.config import get_app_config


def main() -> None:
    config = get_app_config()
    server = uvicorn.Server(
        uvicorn.Config(
            create_app(
                shutdown_callback=lambda: setattr(server, "should_exit", True),
            ),
            host=config.daemon.host,
            port=config.daemon.port,
            log_level="info",
        )
    )
    server.run()


if __name__ == "__main__":
    main()
