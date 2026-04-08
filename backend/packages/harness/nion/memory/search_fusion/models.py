from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, confloat

SEARCH_ROUTES = ("taxonomy", "fts", "link", "vector")

SearchRoute = Literal["taxonomy", "fts", "link", "vector"]
Score = confloat(ge=0.0, le=1.0, allow_inf_nan=False)


class SearchRouteHit(BaseModel):
    candidate_id: str
    route: SearchRoute
    score: Score


class FusedSearchCandidate(BaseModel):
    candidate_id: str
    fused_score: float
    routes: tuple[SearchRoute, ...] = Field(default_factory=tuple)
    route_scores: dict[SearchRoute, float] = Field(default_factory=dict)
