from __future__ import annotations

from collections.abc import Iterable

from nion.memory.search_fusion.models import FusedSearchCandidate, SEARCH_ROUTES, SearchRoute, SearchRouteHit

ROUTE_WEIGHTS: dict[SearchRoute, float] = {
    "taxonomy": 1.0,
    "fts": 0.6,
    "link": 0.8,
    "vector": 0.7,
}


def fuse_memory_search_hits(
    *,
    taxonomy_hits: Iterable[SearchRouteHit],
    fts_hits: Iterable[SearchRouteHit],
    link_hits: Iterable[SearchRouteHit],
    vector_hits: Iterable[SearchRouteHit] = (),
) -> list[FusedSearchCandidate]:
    merged: dict[str, dict[SearchRoute, float]] = {}
    for hit in taxonomy_hits:
        _accumulate(merged, hit)
    for hit in fts_hits:
        _accumulate(merged, hit)
    for hit in link_hits:
        _accumulate(merged, hit)
    for hit in vector_hits:
        _accumulate(merged, hit)

    candidates = [
        FusedSearchCandidate(
            candidate_id=candidate_id,
            fused_score=_fused_score(route_scores),
            routes=_ordered_routes(route_scores),
            route_scores=route_scores,
        )
        for candidate_id, route_scores in merged.items()
    ]
    candidates.sort(key=lambda item: (-item.fused_score, item.candidate_id))
    return candidates


def _accumulate(merged: dict[str, dict[SearchRoute, float]], hit: SearchRouteHit) -> None:
    candidate_id = _normalize_candidate_id(hit.candidate_id)
    if not candidate_id:
        raise ValueError("candidate_id must not be empty")

    route_scores = merged.setdefault(candidate_id, {})
    route_scores[hit.route] = max(float(hit.score), float(route_scores.get(hit.route, 0.0)))


def _normalize_candidate_id(candidate_id: str) -> str:
    return candidate_id.strip().lower()


def _fused_score(route_scores: dict[SearchRoute, float]) -> float:
    return sum(score * ROUTE_WEIGHTS[route] for route, score in route_scores.items())


def _ordered_routes(route_scores: dict[SearchRoute, float]) -> tuple[SearchRoute, ...]:
    return tuple(route for route in SEARCH_ROUTES if route in route_scores)
