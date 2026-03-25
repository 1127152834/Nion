from __future__ import annotations

from nion.model_management.repository import ModelManagementRepository
from nion.model_management.seed import seed_builtin_provider_templates


def test_seed_builtin_templates_creates_marketplace_catalog(tmp_path):
    repo = ModelManagementRepository(tmp_path / "config.db")

    seed_builtin_provider_templates(repo)
    domestic = repo.list_provider_templates(category="domestic")
    global_templates = repo.list_provider_templates(category="global")

    assert any(item.code == "minimax-cn" for item in domestic)
    assert any(item.code == "openrouter" for item in global_templates)
    assert sum(item.code == "custom-provider" for item in domestic) == 1


def test_seed_builtin_templates_maps_custom_provider_into_all_categories(tmp_path):
    repo = ModelManagementRepository(tmp_path / "config.db")

    seed_builtin_provider_templates(repo)

    for category in ("domestic", "aggregator", "global", "local"):
        templates = repo.list_provider_templates(category=category)
        assert sum(item.code == "custom-provider" for item in templates) == 1


def test_seed_builtin_templates_is_idempotent(tmp_path):
    repo = ModelManagementRepository(tmp_path / "config.db")

    seed_builtin_provider_templates(repo)
    seed_builtin_provider_templates(repo)

    templates = repo.list_provider_templates()
    codes = [item.code for item in templates]

    assert len(codes) == len(set(codes))
    assert sum(code == "custom-provider" for code in codes) == 1
