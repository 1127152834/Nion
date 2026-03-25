from nion.config.paths import Paths
from nion.config.relationship_config import RelationshipConfig


def test_relationship_config_defaults() -> None:
    config = RelationshipConfig()

    assert config.enabled is True
    assert config.default_type == "neutral"
    assert config.default_familiarity == "formal"


def test_paths_expose_relationship_file() -> None:
    paths = Paths(base_dir="/tmp/nion")

    assert paths.agent_relationship_file("companion").as_posix().endswith(
        "/agents/companion/relationship.json"
    )
