from nion.relationships.models import FamiliarityLevel, RelationshipProfile, RelationshipType
from nion.relationships.repository import RelationshipRepository


def test_relationship_profile_persists_per_agent(tmp_path) -> None:
    repo = RelationshipRepository(base_dir=tmp_path)
    repo.save(
        "companion",
        RelationshipProfile(
            agent_name="companion",
            relationship_type=RelationshipType.friend,
            familiarity_level=FamiliarityLevel.familiar,
            address_style="阿城",
        ),
    )

    loaded = repo.load("companion")

    assert loaded.agent_name == "companion"
    assert loaded.relationship_type == RelationshipType.friend
    assert loaded.familiarity_level == FamiliarityLevel.familiar
    assert loaded.address_style == "阿城"


def test_relationship_profile_defaults_when_missing(tmp_path) -> None:
    repo = RelationshipRepository(base_dir=tmp_path)

    loaded = repo.load("companion")

    assert loaded.agent_name == "companion"
    assert loaded.relationship_type == RelationshipType.neutral
    assert loaded.familiarity_level == FamiliarityLevel.formal
