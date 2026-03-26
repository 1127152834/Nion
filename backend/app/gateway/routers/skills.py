import json
import logging
import shutil
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from app.gateway.path_utils import resolve_thread_virtual_path
from nion.config.extensions_config import ExtensionsConfig, SkillStateConfig, get_extensions_config, reload_extensions_config
from nion.config.paths import get_paths
from nion.skills import (
    Skill,
    SkillAlreadyExistsError,
    install_skill_from_archive,
    load_skills,
)
from nion.telemetry.logger import make_event
from nion.telemetry.store import TelemetryStore

logger = logging.getLogger(__name__)


router = APIRouter(prefix="/api", tags=["skills"])


class SkillResponse(BaseModel):
    """Response model for skill information."""

    name: str = Field(..., description="Name of the skill")
    description: str = Field(..., description="Description of what the skill does")
    license: str | None = Field(None, description="License information")
    category: str = Field(..., description="Category of the skill (public or custom)")
    enabled: bool = Field(default=True, description="Whether this skill is enabled")


class SkillsListResponse(BaseModel):
    """Response model for listing all skills."""

    skills: list[SkillResponse]


class SkillUpdateRequest(BaseModel):
    """Request model for updating a skill."""

    enabled: bool = Field(..., description="Whether to enable or disable the skill")


class SkillInstallRequest(BaseModel):
    """Request model for installing a skill from a .skill file."""

    thread_id: str = Field(..., description="The thread ID where the .skill file is located")
    path: str = Field(..., description="Virtual path to the .skill file (e.g., mnt/user-data/outputs/my-skill.skill)")


class SkillInstallResponse(BaseModel):
    """Response model for skill installation."""

    success: bool = Field(..., description="Whether the installation was successful")
    skill_name: str = Field(..., description="Name of the installed skill")
    message: str = Field(..., description="Installation result message")


class SkillDeleteResponse(BaseModel):
    """Response model for deleting a custom skill."""

    success: bool = Field(..., description="Whether deletion succeeded")
    skill_name: str = Field(..., description="Deleted skill name")
    message: str = Field(..., description="Deletion result message")
def _skill_to_response(skill: Skill) -> SkillResponse:
    """Convert a Skill object to a SkillResponse."""
    return SkillResponse(
        name=skill.name,
        description=skill.description,
        license=skill.license,
        category=skill.category,
        enabled=skill.enabled,
    )


def _record_skill_event(
    request: Request | None,
    *,
    level: str,
    event_type: str,
    message: str,
    skill_name: str | None = None,
    details: dict[str, object] | None = None,
) -> None:
    try:
        payload_details: dict[str, object] = dict(details or {})
        if skill_name is not None:
            payload_details.setdefault("skill_name", skill_name)
        daemon_service = getattr(getattr(request, "app", None), "state", None)
        daemon_service = getattr(daemon_service, "daemon_service", None)
        if daemon_service is not None and hasattr(daemon_service, "record_skill_event"):
            daemon_service.record_skill_event(  # type: ignore[attr-defined]
                level=level,
                event_type=event_type,
                message=message,
                skill_name=skill_name,
                details=payload_details,
            )
            return

        telemetry_store = getattr(daemon_service, "telemetry_store", None)
        store = telemetry_store or TelemetryStore(get_paths().telemetry_db_file)
        store.record_event(
            make_event(
                category="skill",
                level=level,  # type: ignore[arg-type]
                event_type=event_type,
                actor="system",
                message=message,
                skill_name=skill_name,
                details=payload_details,
            )
        )
    except Exception:
        logger.warning("Failed to record skill event %s", event_type, exc_info=True)


@router.get(
    "/skills",
    response_model=SkillsListResponse,
    summary="List All Skills",
    description="Retrieve a list of all available skills from both public and custom directories.",
)
async def list_skills() -> SkillsListResponse:
    """List all available skills.

    Returns all skills regardless of their enabled status.

    Returns:
        A list of all skills with their metadata.

    Example Response:
        ```json
        {
            "skills": [
                {
                    "name": "PDF Processing",
                    "description": "Extract and analyze PDF content",
                    "license": "MIT",
                    "category": "public",
                    "enabled": true
                },
                {
                    "name": "Frontend Design",
                    "description": "Generate frontend designs and components",
                    "license": null,
                    "category": "custom",
                    "enabled": false
                }
            ]
        }
        ```
    """
    try:
        # Load all skills (including disabled ones)
        skills = load_skills(enabled_only=False)
        return SkillsListResponse(skills=[_skill_to_response(skill) for skill in skills])
    except Exception as e:
        logger.error(f"Failed to load skills: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to load skills: {str(e)}")


@router.get(
    "/skills/{skill_name}",
    response_model=SkillResponse,
    summary="Get Skill Details",
    description="Retrieve detailed information about a specific skill by its name.",
)
async def get_skill(skill_name: str, request: Request) -> SkillResponse:
    """Get a specific skill by name.

    Args:
        skill_name: The name of the skill to retrieve.

    Returns:
        Skill information if found.

    Raises:
        HTTPException: 404 if skill not found.

    Example Response:
        ```json
        {
            "name": "PDF Processing",
            "description": "Extract and analyze PDF content",
            "license": "MIT",
            "category": "public",
            "enabled": true
        }
        ```
    """
    try:
        skills = load_skills(enabled_only=False)
        skill = next((s for s in skills if s.name == skill_name), None)

        if skill is None:
            raise HTTPException(status_code=404, detail=f"Skill '{skill_name}' not found")

        _record_skill_event(
            request,
            level="info",
            event_type="skill_read",
            message=f"Read skill '{skill_name}'",
            skill_name=skill_name,
            details={"category": skill.category, "enabled": skill.enabled},
        )
        return _skill_to_response(skill)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get skill {skill_name}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get skill: {str(e)}")


@router.put(
    "/skills/{skill_name}",
    response_model=SkillResponse,
    summary="Update Skill",
    description="Update a skill's enabled status by modifying the extensions_config.json file.",
)
async def update_skill(
    skill_name: str,
    request: SkillUpdateRequest,
    http_request: Request,
) -> SkillResponse:
    """Update a skill's enabled status.

    This will modify the extensions_config.json file to update the enabled state.
    The SKILL.md file itself is not modified.

    Args:
        skill_name: The name of the skill to update.
        request: The update request containing the new enabled status.

    Returns:
        The updated skill information.

    Raises:
        HTTPException: 404 if skill not found, 500 if update fails.

    Example Request:
        ```json
        {
            "enabled": false
        }
        ```

    Example Response:
        ```json
        {
            "name": "PDF Processing",
            "description": "Extract and analyze PDF content",
            "license": "MIT",
            "category": "public",
            "enabled": false
        }
        ```
    """
    try:
        _record_skill_event(
            http_request,
            level="info",
            event_type="skill_update_requested",
            message=f"Skill update requested for '{skill_name}'",
            skill_name=skill_name,
            details={"enabled": request.enabled},
        )
        # Find the skill to verify it exists
        skills = load_skills(enabled_only=False)
        skill = next((s for s in skills if s.name == skill_name), None)

        if skill is None:
            raise HTTPException(status_code=404, detail=f"Skill '{skill_name}' not found")

        # Get or create config path
        config_path = ExtensionsConfig.resolve_config_path()
        if config_path is None:
            # Create new config file in parent directory (project root)
            config_path = Path.cwd().parent / "extensions_config.json"
            logger.info(f"No existing extensions config found. Creating new config at: {config_path}")

        # Load current configuration
        extensions_config = get_extensions_config()

        # Update the skill's enabled status
        extensions_config.skills[skill_name] = SkillStateConfig(enabled=request.enabled)

        # Convert to JSON format (preserve MCP servers config)
        config_data = {
            "mcpServers": {name: server.model_dump() for name, server in extensions_config.mcp_servers.items()},
            "skills": {name: {"enabled": skill_config.enabled} for name, skill_config in extensions_config.skills.items()},
        }

        # Write the configuration to file
        with open(config_path, "w", encoding="utf-8") as f:
            json.dump(config_data, f, indent=2)

        logger.info(f"Skills configuration updated and saved to: {config_path}")

        # Reload the extensions config to update the global cache
        reload_extensions_config()

        # Reload the skills to get the updated status (for API response)
        skills = load_skills(enabled_only=False)
        updated_skill = next((s for s in skills if s.name == skill_name), None)

        if updated_skill is None:
            raise HTTPException(status_code=500, detail=f"Failed to reload skill '{skill_name}' after update")

        logger.info(f"Skill '{skill_name}' enabled status updated to {request.enabled}")
        _record_skill_event(
            http_request,
            level="info",
            event_type="skill_update_applied",
            message=f"Updated skill '{skill_name}'",
            skill_name=skill_name,
            details={"enabled": request.enabled},
        )
        return _skill_to_response(updated_skill)

    except HTTPException as exc:
        _record_skill_event(
            http_request,
            level="warning",
            event_type="skill_update_failed",
            message=f"Failed to update skill '{skill_name}'",
            skill_name=skill_name,
            details={"reason": exc.detail, "status_code": exc.status_code},
        )
        raise
    except Exception as e:
        logger.error(f"Failed to update skill {skill_name}: {e}", exc_info=True)
        _record_skill_event(
            http_request,
            level="error",
            event_type="skill_update_failed",
            message=f"Failed to update skill '{skill_name}'",
            skill_name=skill_name,
            details={"reason": str(e)},
        )
        raise HTTPException(status_code=500, detail=f"Failed to update skill: {str(e)}")


@router.post(
    "/skills/install",
    response_model=SkillInstallResponse,
    summary="Install Skill",
    description="Install a skill from a .skill file (ZIP archive) located in the thread's user-data directory.",
)
async def install_skill(
    request: SkillInstallRequest,
    http_request: Request,
) -> SkillInstallResponse:
    """Install a skill from a .skill file.

    The .skill file is a ZIP archive containing a skill directory with SKILL.md
    and optional resources (scripts, references, assets).

    Args:
        request: The install request containing thread_id and virtual path to .skill file.

    Returns:
        Installation result with skill name and status message.

    Raises:
        HTTPException:
            - 400 if path is invalid or file is not a valid .skill file
            - 403 if access denied (path traversal detected)
            - 404 if file not found
            - 409 if skill already exists
            - 500 if installation fails

    Example Request:
        ```json
        {
            "thread_id": "abc123-def456",
            "path": "/mnt/user-data/outputs/my-skill.skill"
        }
        ```

    Example Response:
        ```json
        {
            "success": true,
            "skill_name": "my-skill",
            "message": "Skill 'my-skill' installed successfully"
        }
        ```
    """
    try:
        _record_skill_event(
            http_request,
            level="info",
            event_type="skill_install_requested",
            message="Skill install requested",
            details={"thread_id": request.thread_id, "path": request.path},
        )
        skill_file_path = resolve_thread_virtual_path(request.thread_id, request.path)
        installed = install_skill_from_archive(skill_file_path)
        skill_name = installed["skill_name"]

        logger.info("Skill '%s' installed successfully from %s", skill_name, skill_file_path)
        _record_skill_event(
            http_request,
            level="info",
            event_type="skill_install_applied",
            message=f"Installed skill '{skill_name}'",
            skill_name=skill_name,
            details={"path": request.path},
        )
        return SkillInstallResponse(
            success=True,
            skill_name=skill_name,
            message=installed["message"],
        )

    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except SkillAlreadyExistsError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except HTTPException as exc:
        _record_skill_event(
            http_request,
            level="warning",
            event_type="skill_install_failed",
            message="Failed to install skill",
            details={
                "reason": exc.detail,
                "status_code": exc.status_code,
                "path": request.path,
                "thread_id": request.thread_id,
            },
        )
        raise
    except Exception as e:
        logger.error(f"Failed to install skill: {e}", exc_info=True)
        _record_skill_event(
            http_request,
            level="error",
            event_type="skill_install_failed",
            message="Failed to install skill",
            details={"reason": str(e), "path": request.path},
        )
        raise HTTPException(status_code=500, detail=f"Failed to install skill: {str(e)}")


@router.delete(
    "/skills/{skill_name}",
    response_model=SkillDeleteResponse,
    summary="Delete Skill",
    description="Delete a custom skill and remove its persisted enabled-state override.",
)
async def delete_skill(skill_name: str, request: Request) -> SkillDeleteResponse:
    try:
        _record_skill_event(
            request,
            level="info",
            event_type="skill_delete_requested",
            message=f"Skill delete requested for '{skill_name}'",
            skill_name=skill_name,
            details={},
        )
        skills = load_skills(enabled_only=False)
        skill = next((s for s in skills if s.name == skill_name), None)
        if skill is None:
            raise HTTPException(status_code=404, detail=f"Skill '{skill_name}' not found")
        if skill.category != "custom":
            raise HTTPException(status_code=400, detail="Only custom skills can be deleted")

        target_dir = skill.skill_dir
        if not target_dir.exists():
            raise HTTPException(status_code=404, detail=f"Skill directory not found for '{skill_name}'")

        shutil.rmtree(target_dir)

        config_path = ExtensionsConfig.resolve_config_path()
        if config_path is not None:
            extensions_config = get_extensions_config()
            extensions_config.skills.pop(skill_name, None)
            config_data = {
                "mcpServers": {
                    name: server.model_dump()
                    for name, server in extensions_config.mcp_servers.items()
                },
                "skills": {
                    name: {"enabled": skill_config.enabled}
                    for name, skill_config in extensions_config.skills.items()
                },
            }
            with open(config_path, "w", encoding="utf-8") as f:
                json.dump(config_data, f, indent=2)
            reload_extensions_config()

        logger.info("Skill '%s' deleted successfully", skill_name)
        _record_skill_event(
            request,
            level="info",
            event_type="skill_delete_applied",
            message=f"Deleted skill '{skill_name}'",
            skill_name=skill_name,
            details={},
        )
        return SkillDeleteResponse(
            success=True,
            skill_name=skill_name,
            message=f"Skill '{skill_name}' deleted successfully",
        )
    except HTTPException as exc:
        _record_skill_event(
            request,
            level="warning",
            event_type="skill_delete_failed",
            message=f"Failed to delete skill '{skill_name}'",
            skill_name=skill_name,
            details={"reason": exc.detail, "status_code": exc.status_code},
        )
        raise
    except Exception as e:
        logger.error(f"Failed to delete skill {skill_name}: {e}", exc_info=True)
        _record_skill_event(
            request,
            level="error",
            event_type="skill_delete_failed",
            message=f"Failed to delete skill '{skill_name}'",
            skill_name=skill_name,
            details={"reason": str(e)},
        )
        raise HTTPException(status_code=500, detail=f"Failed to delete skill: {str(e)}")
