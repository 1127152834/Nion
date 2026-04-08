from __future__ import annotations

from nion.memory.search_fusion.models import SearchRouteHit
from nion.memory.search_fusion.service import fuse_memory_search_hits


def test_fusion_merges_hits_by_normalized_candidate_id():
    results = fuse_memory_search_hits(
        taxonomy_hits=[
            SearchRouteHit(candidate_id="  MEM:User:Style  ", route="taxonomy", score=0.8),
        ],
        fts_hits=[
            SearchRouteHit(candidate_id="mem:user:style", route="fts", score=0.4),
        ],
        link_hits=[],
    )

    assert len(results) == 1
    assert results[0].candidate_id == "mem:user:style"
    assert results[0].routes == ("taxonomy", "fts")
    assert results[0].route_scores == {
        "taxonomy": 0.8,
        "fts": 0.4,
    }


def test_fusion_applies_weighted_ranking_across_routes():
    results = fuse_memory_search_hits(
        taxonomy_hits=[
            SearchRouteHit(candidate_id="mem:taxonomy-first", route="taxonomy", score=0.7),
        ],
        fts_hits=[
            SearchRouteHit(candidate_id="mem:fts-only", route="fts", score=0.95),
        ],
        link_hits=[
            SearchRouteHit(candidate_id="mem:link-boosted", route="link", score=0.8),
            SearchRouteHit(candidate_id="mem:taxonomy-first", route="link", score=0.2),
        ],
    )

    assert [item.candidate_id for item in results] == [
        "mem:taxonomy-first",
        "mem:link-boosted",
        "mem:fts-only",
    ]
    assert results[0].fused_score > results[1].fused_score > results[2].fused_score


def test_fusion_uses_deterministic_stable_ordering_for_ties():
    results = fuse_memory_search_hits(
        taxonomy_hits=[
            SearchRouteHit(candidate_id=" mem:zeta ", route="taxonomy", score=0.5),
            SearchRouteHit(candidate_id="mem:alpha", route="taxonomy", score=0.5),
        ],
        fts_hits=[],
        link_hits=[],
    )

    assert [item.candidate_id for item in results] == [
        "mem:alpha",
        "mem:zeta",
    ]


def test_fusion_accepts_vector_hits_as_optional_reserved_route():
    results = fuse_memory_search_hits(
        taxonomy_hits=[],
        fts_hits=[],
        link_hits=[],
        vector_hits=[
            SearchRouteHit(candidate_id="mem:vector", route="vector", score=0.6),
        ],
    )

    assert len(results) == 1
    assert results[0].candidate_id == "mem:vector"
    assert results[0].routes == ("vector",)
