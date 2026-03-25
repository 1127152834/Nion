"""Service helpers for relationship-state access."""

from nion.relationships.models import RelationshipProfile
from nion.relationships.repository import RelationshipRepository


class RelationshipService:
    """Thin application-facing wrapper over the repository."""

    def __init__(self, repository: RelationshipRepository):
        self._repository = repository

    def get_profile(self, agent_name: str) -> RelationshipProfile:
        return self._repository.load(agent_name)

    def update_profile(self, agent_name: str, profile: RelationshipProfile) -> RelationshipProfile:
        return self._repository.save(agent_name, profile)

    def reset_profile(self, agent_name: str) -> RelationshipProfile:
        return self._repository.reset(agent_name)
