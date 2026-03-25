"""Structured relationship-state models kept separate from memory facts."""

from enum import Enum

from pydantic import BaseModel, Field


class RelationshipType(str, Enum):
    neutral = "neutral"
    friend = "friend"
    mentor = "mentor"
    elder_brother = "elder_brother"
    younger_brother = "younger_brother"
    teacher = "teacher"
    father = "father"
    boyfriend = "boyfriend"
    girlfriend = "girlfriend"


class FamiliarityLevel(str, Enum):
    formal = "formal"
    familiar = "familiar"
    close = "close"
    confidant = "confidant"


class RelationshipConsentFlags(BaseModel):
    allow_affectionate_language: bool = False
    allow_romantic_framing: bool = False
    allow_parental_framing: bool = False
    allow_proactive_checkins: bool = False
    allow_custom_nickname: bool = False


class RelationshipProfile(BaseModel):
    version: str = "1.0"
    agent_name: str | None = None
    user_scope: str = "global"
    relationship_type: RelationshipType = RelationshipType.neutral
    familiarity_level: FamiliarityLevel = FamiliarityLevel.formal
    address_style: str = ""
    initiative_level: int = Field(default=1, ge=1, le=5)
    humor_tolerance: int = Field(default=1, ge=1, le=5)
    emotional_warmth: int = Field(default=1, ge=1, le=5)
    emotional_intensity_cap: int = Field(default=1, ge=1, le=5)
    preferred_boundaries: list[str] = Field(default_factory=list)
    disallowed_modes: list[str] = Field(default_factory=list)
    consent_flags: RelationshipConsentFlags = Field(default_factory=RelationshipConsentFlags)
    last_confirmed_at: str = ""
    updated_at: str = ""
