import {
  addProviderModels,
  createProviderInstance,
  deleteProviderInstance,
  deleteProviderModel,
  loadProviderBindings,
  loadProviderInstances,
  updateBinding,
  updateProviderInstance,
} from "@/core/model-admin/api";
import type {
  ProviderInstanceRecord,
  ProviderModelRecord,
} from "@/core/model-admin/types";

import {
  asArray,
  asBoolean,
  asString,
  type ConfigDraft,
} from "../configuration/shared";

import { buildDraftProviderConnectionSignature } from "./provider-connection";

const MODEL_PROVIDERS_KEY = "model_providers";

function defaultUseByProtocol(protocol: "openai-compatible" | "anthropic-compatible"): string {
  return protocol === "anthropic-compatible"
    ? "langchain_anthropic:ChatAnthropic"
    : "langchain_openai:ChatOpenAI";
}

function inferProtocol(provider: ProviderInstanceRecord): "openai-compatible" | "anthropic-compatible" {
  const protocol = provider.protocol_override ?? provider.template?.protocol ?? "openai-compatible";
  return protocol === "anthropic-compatible"
    ? "anthropic-compatible"
    : "openai-compatible";
}

function sortedModels(provider: ProviderInstanceRecord): ProviderModelRecord[] {
  return [...provider.models].sort((a, b) => {
    if (a.is_primary !== b.is_primary) {
      return a.is_primary ? -1 : 1;
    }
    return a.priority_order - b.priority_order;
  });
}

export async function loadLegacyModelSettingsDraft(): Promise<ConfigDraft> {
  const providers = (await loadProviderInstances()).filter(
    (provider) => provider.kind === "custom",
  );

  const draftProviders = providers.map((provider) => {
    const protocol = inferProtocol(provider);
    const models = sortedModels(provider);
    return {
      id: provider.id,
      name: provider.display_name,
      protocol,
      use: defaultUseByProtocol(protocol),
      api_key: provider.api_key_masked ?? "",
      api_key_masked: provider.api_key_masked ?? "",
      api_key_length: provider.api_key_masked?.length ?? 0,
      api_key_present: Boolean(provider.api_key_masked),
      api_key_dirty: false,
      api_base: provider.base_url_override ?? "",
      test_model: models[0]?.model_id ?? "",
      catalog_models: [],
      catalog_updated_at: provider.last_discovery_at ?? "",
      catalog_provider_type: "",
      catalog_message: provider.last_discovery_message ?? "",
      last_tested_at: provider.provider_last_tested_at ?? "",
      last_test_status: provider.provider_test_status,
      last_test_message: provider.provider_test_message ?? "",
      last_test_signature:
        provider.provider_test_signature
        ?? buildDraftProviderConnectionSignature({
          protocol,
          apiBase: provider.base_url_override ?? "",
          apiKeyDisplay: provider.api_key_masked ?? "",
        }),
    };
  });

  const draftModels = providers.flatMap((provider) => {
    const protocol = inferProtocol(provider);
    const providerUse = defaultUseByProtocol(protocol);
    return sortedModels(provider).map((model) => ({
      name: model.id,
      display_name: model.display_name,
      description: "",
      model: model.model_id,
      provider_id: provider.id,
      provider_protocol: protocol,
      use: providerUse,
      api_key: "",
      api_base: provider.base_url_override ?? "",
      supports_thinking: Boolean(model.supports_thinking),
      supports_reasoning_effort: Boolean(model.supports_reasoning_effort),
      supports_vision: Boolean(model.supports_vision),
      supports_video: Boolean(model.supports_video),
      context_window: model.context_window ?? undefined,
      max_tokens: model.max_output_tokens ?? undefined,
      _provider_model_id: model.id,
    }));
  });

  return {
    [MODEL_PROVIDERS_KEY]: draftProviders,
    models: draftModels,
  };
}

export async function saveLegacyModelSettingsDraft(config: ConfigDraft): Promise<void> {
  const currentProviders = (await loadProviderInstances()).filter(
    (provider) => provider.kind === "custom",
  );
  const currentBindings = await loadProviderBindings();

  const draftProviders = asArray(config[MODEL_PROVIDERS_KEY]);
  const draftModels = asArray(config.models);

  const currentById = new Map(currentProviders.map((provider) => [provider.id, provider]));
  const nextProviderIds = new Set<string>();
  const providerIdMap = new Map<string, string>();

  for (const provider of draftProviders) {
    const draftId = asString(provider.id).trim();
    const protocol = asString(provider.protocol).trim() === "anthropic-compatible"
      ? "anthropic-compatible"
      : "openai-compatible";
    const payload = {
      display_name: asString(provider.name).trim() || "Provider",
      protocol_override: protocol,
      base_url_override: asString(provider.api_base).trim() || null,
    } as const;
    const apiKeyDirty = asBoolean(provider.api_key_dirty, false);
    const apiKeyValue = asString(provider.api_key).trim();
    const mutationPayload = apiKeyDirty
      ? {
          ...payload,
          api_key: apiKeyValue,
        }
      : payload;

    if (draftId && currentById.has(draftId)) {
      await updateProviderInstance(draftId, mutationPayload);
      providerIdMap.set(draftId, draftId);
      nextProviderIds.add(draftId);
      continue;
    }

    const created = await createProviderInstance({
      kind: "custom",
      ...mutationPayload,
    });
    const createdId = created.provider.id;
    providerIdMap.set(draftId || createdId, createdId);
    nextProviderIds.add(createdId);
  }

  for (const provider of currentProviders) {
    if (!nextProviderIds.has(provider.id)) {
      await deleteProviderInstance(provider.id);
    }
  }

  const refreshedProviders = (await loadProviderInstances()).filter(
    (provider) => provider.kind === "custom",
  );

  for (const provider of refreshedProviders) {
    for (const model of provider.models) {
      await deleteProviderModel(model.id);
    }
  }

  const globalDefaultDraft = draftModels[0] ?? null;
  let globalDefaultProviderModelId: string | null = null;

  const modelsByProviderDraftId = new Map<string, Record<string, unknown>[]>();
  for (const model of draftModels) {
    const providerId = asString(model.provider_id).trim();
    if (!providerId) {
      continue;
    }
    const bucket = modelsByProviderDraftId.get(providerId) ?? [];
    bucket.push(model);
    modelsByProviderDraftId.set(providerId, bucket);
  }

  for (const [draftProviderId, models] of modelsByProviderDraftId.entries()) {
    const providerId = providerIdMap.get(draftProviderId) ?? draftProviderId;
    const response = await addProviderModels(providerId, {
      models: models.map((model, index) => ({
        model_id: asString(model.model).trim(),
        display_name: asString(model.display_name).trim() || asString(model.model).trim(),
        source: "manual",
        is_primary: index === 0,
        priority_order: index,
        supports_thinking: asBoolean(model.supports_thinking, false),
        supports_reasoning_effort: asBoolean(model.supports_reasoning_effort, false),
        supports_vision: asBoolean(model.supports_vision, false),
        supports_video: asBoolean(model.supports_video, false),
        context_window: (() => {
          const value = Number(model.context_window);
          return Number.isFinite(value) ? value : undefined;
        })(),
        max_output_tokens: (() => {
          const value = Number(model.max_tokens);
          return Number.isFinite(value) ? value : undefined;
        })(),
      })),
    });

    if (
      globalDefaultDraft
      && asString(globalDefaultDraft.provider_id).trim() === draftProviderId
      && response.models[0]?.id
    ) {
      const defaultModelId = asString(globalDefaultDraft.model).trim();
      const matched = response.models.find((model) => model.model_id === defaultModelId);
      globalDefaultProviderModelId = matched?.id ?? response.models[0].id;
    }
  }

  if (globalDefaultProviderModelId) {
    const existingDefault = currentBindings.find(
      (binding) => binding.binding_key === "chat.default",
    );
    await updateBinding("chat.default", {
      provider_model_id: globalDefaultProviderModelId,
      fallback_provider_model_id: existingDefault?.fallback_provider_model_id ?? null,
      status: existingDefault?.status ?? "active",
    });
  }
}
