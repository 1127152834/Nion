import inspect
import json
import logging

from fastapi import APIRouter
from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, Field

from nion.config.suggestions_config import get_suggestions_config
from nion.models import create_chat_model
from nion.models.factory import resolve_model_name_with_fallback

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["suggestions"])


class SuggestionMessage(BaseModel):
    role: str = Field(..., description="Message role: user|assistant")
    content: str = Field(..., description="Message content as plain text")


class SuggestionsRequest(BaseModel):
    messages: list[SuggestionMessage] = Field(..., description="Recent conversation messages")
    n: int = Field(default=3, ge=1, le=5, description="Number of suggestions to generate")
    model_name: str | None = Field(default=None, description="Deprecated request override")


class SuggestionsResponse(BaseModel):
    suggestions: list[str] = Field(default_factory=list, description="Suggested follow-up questions")


def _strip_markdown_code_fence(text: str) -> str:
    stripped = text.strip()
    if not stripped.startswith("```"):
        return stripped
    lines = stripped.splitlines()
    if len(lines) >= 3 and lines[0].startswith("```") and lines[-1].startswith("```"):
        return "\n".join(lines[1:-1]).strip()
    return stripped


def _parse_json_string_list(text: str) -> list[str] | None:
    candidate = _strip_markdown_code_fence(text)
    start = candidate.find("[")
    end = candidate.rfind("]")
    if start == -1 or end == -1 or end <= start:
        return None
    candidate = candidate[start : end + 1]
    try:
        data = json.loads(candidate)
    except Exception:
        return None
    if not isinstance(data, list):
        return None
    out: list[str] = []
    for item in data:
        if not isinstance(item, str):
            continue
        s = item.strip()
        if not s:
            continue
        out.append(s)
    return out


def _extract_response_text(content: object) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for block in content:
            if isinstance(block, str):
                parts.append(block)
            elif isinstance(block, dict) and block.get("type") in {"text", "output_text"}:
                text = block.get("text")
                if isinstance(text, str):
                    parts.append(text)
        return "\n".join(parts) if parts else ""
    if content is None:
        return ""
    return str(content)


def _format_conversation(messages: list[SuggestionMessage]) -> str:
    parts: list[str] = []
    for m in messages:
        role = m.role.strip().lower()
        if role in ("user", "human"):
            parts.append(f"User: {m.content.strip()}")
        elif role in ("assistant", "ai"):
            parts.append(f"Assistant: {m.content.strip()}")
        else:
            parts.append(f"{m.role}: {m.content.strip()}")
    return "\n".join(parts).strip()


def _build_suggestions_prompt(conversation: str, n: int) -> list[SystemMessage | HumanMessage]:
    return [
        SystemMessage(
            content=(
                "You are generating follow-up questions to help the user continue the conversation.\n"
                f"Based on the provided conversation, produce EXACTLY {n} short questions the user might ask next.\n"
                "Requirements:\n"
                "- Questions must be relevant to the conversation.\n"
                "- Questions must be written in the same language as the user.\n"
                "- Keep each question concise (ideally <= 20 words / <= 40 Chinese characters).\n"
                "- Do NOT include numbering, markdown, or any extra text.\n"
                "- Output MUST be a JSON array of strings only."
            )
        ),
        HumanMessage(content=f"Conversation:\n{conversation}"),
    ]


def _serialize_prompt_messages(prompt: list[SystemMessage | HumanMessage]) -> str:
    return "\n\n".join(str(message.content) for message in prompt if str(message.content).strip())


def _resolve_suggestions_model_name() -> str:
    configured_model_name = (get_suggestions_config().model_name or "").strip()
    if configured_model_name:
        return configured_model_name
    return resolve_model_name_with_fallback(None)


async def _invoke_suggestions_model(model: object, prompt: list[SystemMessage | HumanMessage]) -> object:
    ainvoke = getattr(model, "ainvoke", None)
    if ainvoke is not None and inspect.iscoroutinefunction(ainvoke):
        return await ainvoke(prompt)
    invoke = getattr(model, "invoke")
    return invoke(_serialize_prompt_messages(prompt))


@router.post(
    "/threads/{thread_id}/suggestions",
    response_model=SuggestionsResponse,
    summary="Generate Follow-up Questions",
    description="Generate short follow-up questions a user might ask next, based on recent conversation context.",
)
async def generate_suggestions(thread_id: str, request: SuggestionsRequest) -> SuggestionsResponse:
    if not request.messages:
        return SuggestionsResponse(suggestions=[])

    n = request.n
    conversation = _format_conversation(request.messages)
    if not conversation:
        return SuggestionsResponse(suggestions=[])

    prompt = _build_suggestions_prompt(conversation, n)

    try:
        model_name = _resolve_suggestions_model_name()
        model = create_chat_model(name=model_name, thinking_enabled=False)
        response = await _invoke_suggestions_model(model, prompt)
        raw = _extract_response_text(response.content)
        suggestions = _parse_json_string_list(raw) or []
        cleaned = [s.replace("\n", " ").strip() for s in suggestions if s.strip()]
        cleaned = cleaned[:n]
        return SuggestionsResponse(suggestions=cleaned)
    except Exception as exc:
        logger.exception("Failed to generate suggestions: thread_id=%s err=%s", thread_id, exc)
        return SuggestionsResponse(suggestions=[])
