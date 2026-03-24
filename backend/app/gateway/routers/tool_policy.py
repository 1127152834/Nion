from dataclasses import asdict

from fastapi import APIRouter

from nion.config.app_config import get_app_config
from nion.tools.catalog import build_configured_tool_catalog

router = APIRouter(prefix="/api/tool-policy", tags=["tool-policy"])


@router.get("")
async def get_tool_policy():
    config = get_app_config(process_name="gateway")
    return {
        "scope": "configured-tools-v1",
        "rules": config.surface_policy.model_dump()["rules"],
        "catalog": [
            asdict(entry)
            for entry in build_configured_tool_catalog(config).values()
        ],
    }
