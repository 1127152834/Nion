"""Configuration for conversation summarization."""

from typing import Literal

from pydantic import BaseModel, Field

ContextSizeType = Literal["fraction", "tokens", "messages"]
DEFAULT_SUMMARIZATION_TOKENS = 20480
DEFAULT_SUMMARY_PROMPT = """<role>
Conversation Compression Assistant
</role>

<primary_objective>
Compress older conversation history without losing user decisions, durable preferences, active constraints, or unresolved questions.
</primary_objective>

<critical_rules>
- Treat explicit user choices as authoritative facts and preserve them exactly.
- Preserve implementation constraints, chosen technologies, file targets, acceptance criteria, and anything the assistant has already completed.
- Preserve unresolved ambiguities and pending decisions in a short checklist.
- Do not claim the summary covers the most recent messages if they may still be preserved separately outside this summary.
- Do not invent preferences, requirements, or completed work.
</critical_rules>

<output_format>
Return only concise Markdown with these sections when relevant:
- Goal
- Confirmed decisions
- Constraints
- Completed work
- Remaining open questions
</output_format>

<messages>
Messages to summarize:
{messages}
</messages>"""


class ContextSize(BaseModel):
    """Context size specification for trigger or keep parameters."""

    type: ContextSizeType = Field(description="Type of context size specification")
    value: int | float = Field(description="Value for the context size specification")

    def to_tuple(self) -> tuple[ContextSizeType, int | float]:
        """Convert to tuple format expected by SummarizationMiddleware."""
        return (self.type, self.value)


class SummarizationConfig(BaseModel):
    """Configuration for automatic conversation summarization."""

    enabled: bool = Field(
        default=False,
        description="Whether to enable automatic conversation summarization",
    )
    model_name: str | None = Field(
        default=None,
        description="Model name to use for summarization (None = use a lightweight model)",
    )
    trigger: ContextSize | list[ContextSize] | None = Field(
        default_factory=lambda: ContextSize(
            type="tokens",
            value=DEFAULT_SUMMARIZATION_TOKENS,
        ),
        description="One or more thresholds that trigger summarization. When any threshold is met, summarization runs. "
        "Examples: {'type': 'messages', 'value': 50} triggers at 50 messages, "
        "{'type': 'tokens', 'value': 4000} triggers at 4000 tokens, "
        "{'type': 'fraction', 'value': 0.8} triggers at 80% of model's max input tokens",
    )
    keep: ContextSize = Field(
        default_factory=lambda: ContextSize(type="messages", value=20),
        description="Context retention policy after summarization. Specifies how much history to preserve. "
        "Examples: {'type': 'messages', 'value': 20} keeps 20 messages, "
        "{'type': 'tokens', 'value': 3000} keeps 3000 tokens, "
        "{'type': 'fraction', 'value': 0.3} keeps 30% of model's max input tokens",
    )
    trim_tokens_to_summarize: int | None = Field(
        default=DEFAULT_SUMMARIZATION_TOKENS,
        description="Maximum tokens to keep when preparing messages for summarization. Pass null to skip trimming.",
    )
    summary_prompt: str | None = Field(
        default=DEFAULT_SUMMARY_PROMPT,
        description="Custom prompt template for generating summaries. If not provided, uses the default Nion prompt.",
    )


# Global configuration instance
_summarization_config: SummarizationConfig = SummarizationConfig()


def get_summarization_config() -> SummarizationConfig:
    """Get the current summarization configuration."""
    return _summarization_config


def set_summarization_config(config: SummarizationConfig) -> None:
    """Set the summarization configuration."""
    global _summarization_config
    _summarization_config = config


def load_summarization_config_from_dict(config_dict: dict) -> None:
    """Load summarization configuration from a dictionary."""
    global _summarization_config
    _summarization_config = SummarizationConfig(**config_dict)
