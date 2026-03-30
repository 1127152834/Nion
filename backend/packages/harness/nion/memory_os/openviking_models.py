from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


class OpenVikingProviderConfig(BaseModel):
    mode: Literal["embedded", "remote"]
    base_url: str | None = None
    api_key: str | None = None
