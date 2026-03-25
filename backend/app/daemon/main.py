from __future__ import annotations

import uvicorn

from app.daemon.app import create_app
from nion.config import get_app_config


def main() -> None:
    config = get_app_config()
    uvicorn.run(
        create_app(),
        host=config.daemon.host,
        port=config.daemon.port,
        log_level="info",
    )


if __name__ == "__main__":
    main()
