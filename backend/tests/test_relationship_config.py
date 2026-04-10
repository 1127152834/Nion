from nion.relationships.models import FamiliarityLevel, RelationshipProfile, RelationshipType
from nion.relationships.repository import RelationshipRepository


def test_relationship_profile_defaults() -> None:
    profile = RelationshipProfile(agent_name="companion")

    assert profile.relationship_type == RelationshipType.neutral
    assert profile.familiarity_level == FamiliarityLevel.formal


def test_relationship_repository_uses_agent_specific_relationship_file(tmp_path) -> None:
    repo = RelationshipRepository(base_dir=tmp_path)

    assert repo._profile_path("companion").as_posix().endswith(
        "/agents/companion/relationship.json"
    )
