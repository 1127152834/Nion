"""Persistence for relationship profiles."""

import json
from pathlib import Path

from nion.relationships.models import RelationshipProfile


class RelationshipRepository:
    """Store per-agent relationship state outside structured memory."""

    def __init__(self, base_dir: str | Path):
        self._base_dir = Path(base_dir)

    def _profile_path(self, agent_name: str) -> Path:
        return self._base_dir / "agents" / agent_name.lower() / "relationship.json"

    def load(self, agent_name: str) -> RelationshipProfile:
        path = self._profile_path(agent_name)
        if not path.exists():
            return RelationshipProfile(agent_name=agent_name)

        with open(path, encoding="utf-8") as fh:
            payload = json.load(fh)
        return RelationshipProfile.model_validate(payload)

    def save(self, agent_name: str, profile: RelationshipProfile) -> RelationshipProfile:
        path = self._profile_path(agent_name)
        path.parent.mkdir(parents=True, exist_ok=True)

        stored = profile.model_copy(update={"agent_name": agent_name})
        temp_path = path.with_suffix(".tmp")
        with open(temp_path, "w", encoding="utf-8") as fh:
            json.dump(stored.model_dump(mode="json"), fh, ensure_ascii=False, indent=2)
        temp_path.replace(path)
        return stored

    def reset(self, agent_name: str) -> RelationshipProfile:
        return self.save(agent_name, RelationshipProfile(agent_name=agent_name))
