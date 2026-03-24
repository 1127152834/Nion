from __future__ import annotations

import logging
import os

import uvicorn

from app.gateway.app import create_app

logger = logging.getLogger(__name__)


def main() -> None:
    host = os.getenv("NION_DESKTOP_HELPER_HOST", "127.0.0.1")
    port = int(os.getenv("NION_DESKTOP_HELPER_PORT", "43115"))

    logger.info("Starting Nion desktop helper on %s:%s", host, port)
    uvicorn.run(create_app(), host=host, port=port, log_level="info")


if __name__ == "__main__":
    main()
