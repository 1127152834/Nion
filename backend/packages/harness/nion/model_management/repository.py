from __future__ import annotations

import sqlite3
from pathlib import Path

from nion.model_management.models import (
    ModelBinding,
    ProviderInstance,
    ProviderModel,
    ProviderTemplate,
    ProviderTemplateCategoryMembership,
)


class ModelManagementRepository:
    def __init__(self, db_path: str | Path):
        self._db_path = Path(db_path)
        self._db_path.parent.mkdir(parents=True, exist_ok=True)
        self._initialize()

    @property
    def db_path(self) -> Path:
        return self._db_path

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self._db_path)
        connection.row_factory = sqlite3.Row
        return connection

    @staticmethod
    def _serialize(
        model: ProviderTemplate
        | ProviderTemplateCategoryMembership
        | ProviderInstance
        | ProviderModel
        | ModelBinding,
    ) -> str:
        return model.model_dump_json()

    @staticmethod
    def _deserialize_template(payload: str) -> ProviderTemplate:
        return ProviderTemplate.model_validate_json(payload)

    @staticmethod
    def _deserialize_membership(payload: str) -> ProviderTemplateCategoryMembership:
        return ProviderTemplateCategoryMembership.model_validate_json(payload)

    @staticmethod
    def _deserialize_instance(payload: str) -> ProviderInstance:
        return ProviderInstance.model_validate_json(payload)

    @staticmethod
    def _deserialize_model(payload: str) -> ProviderModel:
        return ProviderModel.model_validate_json(payload)

    @staticmethod
    def _deserialize_binding(payload: str) -> ModelBinding:
        return ModelBinding.model_validate_json(payload)

    def _initialize(self) -> None:
        with self._connect() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS provider_templates (
                    id TEXT PRIMARY KEY,
                    code TEXT NOT NULL UNIQUE,
                    name TEXT NOT NULL,
                    category TEXT,
                    protocol TEXT NOT NULL,
                    status TEXT NOT NULL,
                    sort_order INTEGER NOT NULL DEFAULT 0,
                    is_builtin INTEGER NOT NULL DEFAULT 1,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    payload TEXT NOT NULL
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS provider_template_category_memberships (
                    provider_template_id TEXT NOT NULL,
                    category TEXT NOT NULL,
                    sort_order INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    payload TEXT NOT NULL,
                    PRIMARY KEY (provider_template_id, category)
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS provider_instances (
                    id TEXT PRIMARY KEY,
                    provider_template_id TEXT,
                    kind TEXT NOT NULL,
                    display_name TEXT NOT NULL,
                    status TEXT NOT NULL,
                    provider_test_status TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    payload TEXT NOT NULL
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS provider_models (
                    id TEXT PRIMARY KEY,
                    provider_instance_id TEXT NOT NULL,
                    model_id TEXT NOT NULL,
                    display_name TEXT NOT NULL,
                    source TEXT NOT NULL,
                    is_enabled INTEGER NOT NULL DEFAULT 1,
                    is_primary INTEGER NOT NULL DEFAULT 0,
                    priority_order INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    payload TEXT NOT NULL
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS model_bindings (
                    id TEXT PRIMARY KEY,
                    binding_key TEXT NOT NULL UNIQUE,
                    provider_model_id TEXT NOT NULL,
                    fallback_provider_model_id TEXT,
                    status TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    payload TEXT NOT NULL
                )
                """
            )
            connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_provider_templates_code ON provider_templates(code)"
            )
            connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_provider_instances_template_id ON provider_instances(provider_template_id)"
            )
            connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_provider_models_instance_id ON provider_models(provider_instance_id)"
            )
            connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_model_bindings_binding_key ON model_bindings(binding_key)"
            )

    def upsert_provider_template(self, template: ProviderTemplate) -> ProviderTemplate:
        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO provider_templates (
                    id, code, name, category, protocol, status, sort_order,
                    is_builtin, created_at, updated_at, payload
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    code = excluded.code,
                    name = excluded.name,
                    category = excluded.category,
                    protocol = excluded.protocol,
                    status = excluded.status,
                    sort_order = excluded.sort_order,
                    is_builtin = excluded.is_builtin,
                    created_at = excluded.created_at,
                    updated_at = excluded.updated_at,
                    payload = excluded.payload
                """,
                (
                    template.id,
                    template.code,
                    template.name,
                    template.category,
                    template.protocol,
                    template.status,
                    template.sort_order,
                    int(template.is_builtin),
                    template.created_at,
                    template.updated_at,
                    self._serialize(template),
                ),
            )
        return template

    def save_category_membership(
        self,
        membership: ProviderTemplateCategoryMembership,
    ) -> ProviderTemplateCategoryMembership:
        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO provider_template_category_memberships (
                    provider_template_id, category, sort_order,
                    created_at, updated_at, payload
                )
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(provider_template_id, category) DO UPDATE SET
                    sort_order = excluded.sort_order,
                    created_at = excluded.created_at,
                    updated_at = excluded.updated_at,
                    payload = excluded.payload
                """,
                (
                    membership.provider_template_id,
                    membership.category,
                    membership.sort_order,
                    membership.created_at,
                    membership.updated_at,
                    self._serialize(membership),
                ),
            )
        return membership

    def list_provider_templates(
        self,
        category: str | None = None,
    ) -> list[ProviderTemplate]:
        with self._connect() as connection:
            if category is None:
                rows = connection.execute(
                    """
                    SELECT payload
                    FROM provider_templates
                    ORDER BY sort_order ASC, name ASC, code ASC
                    """
                ).fetchall()
            else:
                rows = connection.execute(
                    """
                    SELECT t.payload
                    FROM provider_templates AS t
                    INNER JOIN provider_template_category_memberships AS m
                        ON m.provider_template_id = t.id
                    WHERE m.category = ?
                    ORDER BY m.sort_order ASC, t.sort_order ASC, t.name ASC, t.code ASC
                    """,
                    (category,),
                ).fetchall()
        return [self._deserialize_template(row["payload"]) for row in rows]

    def save_provider_instance(
        self,
        instance: ProviderInstance,
    ) -> ProviderInstance:
        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO provider_instances (
                    id, provider_template_id, kind, display_name, status,
                    provider_test_status, created_at, updated_at, payload
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    provider_template_id = excluded.provider_template_id,
                    kind = excluded.kind,
                    display_name = excluded.display_name,
                    status = excluded.status,
                    provider_test_status = excluded.provider_test_status,
                    created_at = excluded.created_at,
                    updated_at = excluded.updated_at,
                    payload = excluded.payload
                """,
                (
                    instance.id,
                    instance.provider_template_id,
                    instance.kind,
                    instance.display_name,
                    instance.status,
                    instance.provider_test_status,
                    instance.created_at,
                    instance.updated_at,
                    self._serialize(instance),
                ),
            )
        return instance

    def list_provider_instances(self) -> list[ProviderInstance]:
        with self._connect() as connection:
            rows = connection.execute(
                """
                SELECT payload
                FROM provider_instances
                ORDER BY created_at ASC, display_name ASC, id ASC
                """
            ).fetchall()
        return [self._deserialize_instance(row["payload"]) for row in rows]

    def save_provider_model(self, model: ProviderModel) -> ProviderModel:
        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO provider_models (
                    id, provider_instance_id, model_id, display_name, source,
                    is_enabled, is_primary, priority_order, created_at, updated_at, payload
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    provider_instance_id = excluded.provider_instance_id,
                    model_id = excluded.model_id,
                    display_name = excluded.display_name,
                    source = excluded.source,
                    is_enabled = excluded.is_enabled,
                    is_primary = excluded.is_primary,
                    priority_order = excluded.priority_order,
                    created_at = excluded.created_at,
                    updated_at = excluded.updated_at,
                    payload = excluded.payload
                """,
                (
                    model.id,
                    model.provider_instance_id,
                    model.model_id,
                    model.display_name,
                    model.source,
                    int(model.is_enabled),
                    int(model.is_primary),
                    model.priority_order,
                    model.created_at,
                    model.updated_at,
                    self._serialize(model),
                ),
            )
        return model

    def list_provider_models(self, provider_instance_id: str) -> list[ProviderModel]:
        with self._connect() as connection:
            rows = connection.execute(
                """
                SELECT payload
                FROM provider_models
                WHERE provider_instance_id = ?
                ORDER BY priority_order ASC, created_at ASC, model_id ASC, id ASC
                """,
                (provider_instance_id,),
            ).fetchall()
        return [self._deserialize_model(row["payload"]) for row in rows]

    def save_binding(self, binding: ModelBinding) -> ModelBinding:
        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO model_bindings (
                    id, binding_key, provider_model_id, fallback_provider_model_id,
                    status, created_at, updated_at, payload
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    binding_key = excluded.binding_key,
                    provider_model_id = excluded.provider_model_id,
                    fallback_provider_model_id = excluded.fallback_provider_model_id,
                    status = excluded.status,
                    created_at = excluded.created_at,
                    updated_at = excluded.updated_at,
                    payload = excluded.payload
                """,
                (
                    binding.id,
                    binding.binding_key,
                    binding.provider_model_id,
                    binding.fallback_provider_model_id,
                    binding.status,
                    binding.created_at,
                    binding.updated_at,
                    self._serialize(binding),
                ),
            )
        return binding

    def get_binding(self, binding_key: str) -> ModelBinding | None:
        with self._connect() as connection:
            row = connection.execute(
                """
                SELECT payload
                FROM model_bindings
                WHERE binding_key = ?
                """,
                (binding_key,),
            ).fetchone()
        if row is None:
            return None
        return self._deserialize_binding(row["payload"])
