"use client";

import {
  CircleAlertIcon,
  CircleCheckIcon,
  PlusIcon,
  RefreshCcwIcon,
  SparklesIcon,
  StarIcon,
  Trash2Icon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/core/i18n/hooks";
import {
  loadModelMetadata,
  loadProviderModels,
  testModelConnection,
} from "@/core/models/api";

import { ConfirmActionDialog } from "../../../confirm-action-dialog";
import {
  asArray,
  asBoolean,
  asString,
  cloneConfig,
  type ConfigDraft,
} from "../../shared";

import { getPresetById } from "./presets";
import type { ModelSettingsChildView, PendingDeleteAction } from "./types";
import {
  ANTHROPIC_PROVIDER_PRESET,
  MODEL_PROVIDERS_KEY,
  OPENAI_PROVIDER_PRESET,
  UNASSIGNED_PROVIDER,
} from "./types";
import {
  asCatalogModels,
  asProviders,
  createProviderDraft,
  defaultUseByProtocol,
  ensureUniqueId,
  formatLastTestTime,
  getProviderProtocol,
  mapProviderModelOptionToConfig,
  mergeModelMetadata,
  normalizeModelProviderConfig,
  normalizeProviderProtocol,
  protocolLabel,
  toSafeAlias,
} from "./utils";

export { normalizeModelProviderConfig } from "./utils";
export type { ModelSettingsChildView } from "./types";

export function ModelsSection({
  config,
  onChange,
  disabled,
  view = "providers",
  onViewChange,
}: {
  config: ConfigDraft;
  onChange: (next: ConfigDraft) => void;
  disabled?: boolean;
  view?: ModelSettingsChildView;
  onViewChange?: (nextView: ModelSettingsChildView) => void;
}) {
  const { locale, t } = useI18n();
  const preparedConfig = useMemo(
    () => normalizeModelProviderConfig(config),
    [config],
  );
  const providers = useMemo(() => asProviders(preparedConfig), [preparedConfig]);
  const models = useMemo(() => asArray(preparedConfig.models), [preparedConfig]);
  const providerById = useMemo(() => {
    const map = new Map<string, Record<string, unknown>>();
    providers.forEach((provider) => {
      const id = asString(provider.id).trim();
      if (id) {
        map.set(id, provider);
      }
    });
    return map;
  }, [providers]);

  const settingsLike = t.settings as {
    configSections?: {
      models?: Record<string, string>;
    };
  };
  const m = settingsLike.configSections?.models ?? {};
  const copy = {
    providersTitle: m.providersTitle ?? "Providers",
    providersSubtitle:
      m.providersSubtitle
      ?? "Set up provider connections, then bind models to them.",
    createProvider: m.createProvider ?? "New Provider",
    providerName: m.providerName ?? "Provider Name",
    providerProtocol: m.providerProtocol ?? "Protocol",
    providerProtocolOpenAI:
      m.providerProtocolOpenAI ?? "OpenAI Compatible",
    providerProtocolAnthropic:
      m.providerProtocolAnthropic ?? "Anthropic Compatible",
    apiKey: m.apiKey ?? "API Key / Env Var",
    apiBase: m.apiBase ?? "API Base",
    apiBasePlaceholder:
      m.apiBasePlaceholder ?? "e.g. https://api.openai.com/v1",
    testModel: m.testModel ?? "Test Model",
    testConnection: m.testConnection ?? "Test Connection",
    testingConnection: m.testingConnection ?? "Testing...",
    refreshCatalog: m.refreshCatalog ?? "Refresh Catalog",
    fetchingCatalog: m.fetchingCatalog ?? "Refreshing...",
    deleteProvider: m.deleteProvider ?? "Delete Provider",
    openModelsView: m.openModelsView ?? "Go to Models",
    noProvider: m.noProvider ?? "No providers yet.",
    noProviderHint:
      m.noProviderHint ?? "Create a provider before adding model bindings.",
    modelsBound: m.modelsBound ?? "Bound models",
    statusConnected: m.statusConnected ?? "Connected",
    statusFailed: m.statusFailed ?? "Failed",
    statusUntested: m.statusUntested ?? "Untested",
    lastTestedAt: m.lastTestedAt ?? "Last tested",
    lastTestPreview: m.lastTestPreview ?? "Preview",
    notTested: m.notTested ?? "Not tested",
    catalogUpdatedAt: m.catalogUpdatedAt ?? "Catalog updated",
    catalogSource: m.catalogSource ?? "Catalog source",
    modelCount: m.modelCount ?? "Models",
    modelsTitle: m.modelsTitle ?? "Models",
    modelsSubtitle:
      m.modelsSubtitle ?? "Manage catalog bindings and runtime capabilities.",
    createModel: m.createModel ?? "New Model",
    noModel: m.noModel ?? "No models configured yet.",
    noModelHint:
      m.noModelHint
      ?? "Create a model entry and bind it to a provider or keep it unassigned.",
    displayName: m.displayName ?? "Display Name",
    modelId: m.modelId ?? "Model ID",
    internalName: m.internalName ?? "Internal Name",
    description: m.description ?? "Description",
    bindProvider: m.bindProvider ?? "Provider",
    unassigned: m.unassigned ?? "Unassigned",
    setDefault: m.setDefault ?? "Set Default",
    default: m.default ?? "Default",
    deleteModel: m.deleteModel ?? "Delete Model",
    inspectModel: m.inspectModel ?? "Check Params",
    inspectingModel: m.inspectingModel ?? "Checking...",
    chooseCatalogModel: m.chooseCatalogModel ?? "Catalog Model",
    manualInput: m.manualInput ?? "Manual Input",
    maxTokens: m.maxTokens ?? "Max Output Tokens",
    contextWindow: m.contextWindow ?? "Context Window",
    temperature: m.temperature ?? "Temperature",
    supportsThinking: m.supportsThinking ?? "Supports Reasoning",
    supportsReasoningEffort:
      m.supportsReasoningEffort ?? "Supports Reasoning Effort",
    supportsVision: m.supportsVision ?? "Supports Vision",
    supportsVideo: m.supportsVideo ?? "Supports Video",
    confirmDeleteTitle: m.confirmDeleteTitle ?? "Confirm Deletion",
    confirmDeleteAction: m.confirmDeleteAction ?? "Delete",
    confirmDeleteProvider:
      m.confirmDeleteProvider
      ?? 'Delete provider "{name}"? Bound models will be detached but keep their runtime fields.',
    confirmDeleteModel:
      m.confirmDeleteModel ?? 'Delete model "{name}"?',
    metadataFilled:
      m.metadataFilled ?? "Model parameters were auto-filled.",
    metadataNotFound:
      m.metadataNotFound ?? "No metadata found. No fields were changed.",
    providerTestSuccess: m.providerTestSuccess ?? "Provider connection passed.",
    providerCatalogSuccess:
      m.providerCatalogSuccess ?? "Provider catalog refreshed.",
  };

  const providerNameTemplates = {
    defaultOpenaiProviderNameTemplate:
      m.defaultOpenaiProviderNameTemplate
      ?? "OpenAI Compatible Provider {index}",
    defaultAnthropicProviderNameTemplate:
      m.defaultAnthropicProviderNameTemplate
      ?? "Anthropic Compatible Provider {index}",
  };

  const [selectedProviderId, setSelectedProviderId] = useState(
    asString(providers[0]?.id).trim(),
  );
  const [selectedModelIndex, setSelectedModelIndex] = useState(
    models.length > 0 ? 0 : -1,
  );
  const [testingProviderId, setTestingProviderId] = useState<string | null>(null);
  const [refreshingProviderId, setRefreshingProviderId] = useState<string | null>(
    null,
  );
  const [inspectingModelIndex, setInspectingModelIndex] = useState<number | null>(
    null,
  );
  const [pendingDeleteAction, setPendingDeleteAction] =
    useState<PendingDeleteAction | null>(null);
  const isDisabled = disabled ?? false;

  useEffect(() => {
    if (providers.length === 0) {
      setSelectedProviderId("");
      return;
    }
    if (!providers.some((provider) => asString(provider.id).trim() === selectedProviderId)) {
      setSelectedProviderId(asString(providers[0]?.id).trim());
    }
  }, [providers, selectedProviderId]);

  useEffect(() => {
    if (models.length === 0) {
      setSelectedModelIndex(-1);
      return;
    }
    if (selectedModelIndex < 0 || selectedModelIndex >= models.length) {
      setSelectedModelIndex(0);
    }
  }, [models, selectedModelIndex]);

  const selectedProvider = useMemo(
    () =>
      providers.find(
        (provider) => asString(provider.id).trim() === selectedProviderId,
      ) ?? null,
    [providers, selectedProviderId],
  );
  const selectedModel =
    selectedModelIndex >= 0 && selectedModelIndex < models.length
      ? models[selectedModelIndex]
      : null;

  function emitNextConfig(
    nextProviders: Record<string, unknown>[],
    nextModels: Record<string, unknown>[],
  ) {
    const next = cloneConfig(preparedConfig);
    next[MODEL_PROVIDERS_KEY] = nextProviders;
    next.models = nextModels;
    onChange(normalizeModelProviderConfig(next));
  }

  function updateProviderRecord(
    providerId: string,
    updater: (provider: Record<string, unknown>) => Record<string, unknown>,
  ) {
    emitNextConfig(
      providers.map((provider) =>
        asString(provider.id).trim() === providerId
          ? updater({ ...provider })
          : provider,
      ),
      models,
    );
  }

  function updateSelectedModelRecord(
    updater: (model: Record<string, unknown>) => Record<string, unknown>,
  ) {
    if (selectedModelIndex < 0) {
      return;
    }
    emitNextConfig(
      providers,
      models.map((model, index) =>
        index === selectedModelIndex ? updater({ ...model }) : model,
      ),
    );
  }

  function syncModelWithProvider(
    model: Record<string, unknown>,
    providerId: string,
  ): Record<string, unknown> {
    const next: Record<string, unknown> = { ...model, provider_id: providerId };
    const provider = providerById.get(providerId);
    if (!provider) {
      return next;
    }
    next.use = asString(provider.use).trim();
    next.api_key = asString(provider.api_key);
    const apiBase = asString(provider.api_base).trim();
    if (apiBase) {
      next.api_base = apiBase;
    } else {
      delete next.api_base;
    }
    next.provider_protocol = getProviderProtocol(provider);
    return next;
  }

  function handleCreateProvider() {
    const protocol = "openai-compatible";
    const draft = createProviderDraft(
      protocol,
      providers.length + 1,
      providerNameTemplates,
    );
    const usedIds = new Set(
      providers
        .map((provider) => asString(provider.id).trim())
        .filter((value) => value.length > 0),
    );
    const providerId = ensureUniqueId(
      toSafeAlias(draft.name, `provider-${providers.length + 1}`),
      usedIds,
    );
    const presetId = OPENAI_PROVIDER_PRESET;
    const preset = getPresetById(presetId);

    emitNextConfig(
      [
        ...providers,
        {
          id: providerId,
          name: draft.name,
          preset_id: presetId,
          protocol,
          use: draft.use,
          api_key: draft.api_key,
          api_base: draft.api_base,
          test_model: preset?.defaultTestModel ?? "",
          catalog_models: [],
          catalog_updated_at: "",
          catalog_provider_type: "",
          catalog_message: "",
          last_tested_at: "",
          last_test_success: null,
          last_test_message: "",
          last_test_latency_ms: null,
          last_test_preview: "",
        },
      ],
      models,
    );
    setSelectedProviderId(providerId);
  }

  function handleProviderFieldChange(field: string, value: string) {
    if (!selectedProvider) {
      return;
    }
    updateProviderRecord(selectedProviderId, (provider) => {
      const next = { ...provider, [field]: value };
      if (field === "protocol") {
        const protocol = normalizeProviderProtocol(value);
        const presetId =
          protocol === "anthropic-compatible"
            ? ANTHROPIC_PROVIDER_PRESET
            : OPENAI_PROVIDER_PRESET;
        const preset = getPresetById(presetId);
        const previousPreset = getPresetById(asString(provider.preset_id).trim());
        next.protocol = protocol;
        next.preset_id = presetId;
        if (
          asString(provider.use).trim() === ""
          || asString(provider.use).trim()
            === (previousPreset?.use ?? defaultUseByProtocol(getProviderProtocol(provider)))
        ) {
          next.use = preset?.use ?? defaultUseByProtocol(protocol);
        }
        const currentApiBase = asString(provider.api_base).trim();
        const previousDefault = previousPreset?.defaultApiBase ?? "";
        if (currentApiBase === "" || currentApiBase === previousDefault) {
          next.api_base = preset?.defaultApiBase ?? "";
        }
        if (asString(provider.test_model).trim() === "") {
          next.test_model = preset?.defaultTestModel ?? "";
        }
      }
      return next;
    });
  }

  async function handleTestProvider() {
    if (!selectedProvider) {
      return;
    }
    const providerId = asString(selectedProvider.id).trim();
    const preset = getPresetById(asString(selectedProvider.preset_id).trim());
    const configuredTestModel = asString(selectedProvider.test_model).trim();
    const boundModelId = asString(
      models.find((model) => asString(model.provider_id).trim() === providerId)?.model,
    ).trim();
    const defaultModel = [
      configuredTestModel,
      boundModelId,
      preset?.defaultTestModel ?? "",
    ].find((value) => value.trim().length > 0) ?? "";

    setTestingProviderId(providerId);
    try {
      const providerApiKey = asString(selectedProvider.api_key).trim();
      const providerApiBase = asString(selectedProvider.api_base).trim();
      const result = await testModelConnection({
        use: asString(selectedProvider.use).trim(),
        model: defaultModel !== "" ? defaultModel : null,
        api_key: providerApiKey !== "" ? providerApiKey : null,
        api_base: providerApiBase !== "" ? providerApiBase : null,
        provider_protocol: getProviderProtocol(selectedProvider),
      });
      updateProviderRecord(providerId, (provider) => ({
        ...provider,
        test_model: defaultModel,
        last_tested_at: new Date().toISOString(),
        last_test_success: result.success,
        last_test_message: result.message,
        last_test_latency_ms: result.latency_ms ?? null,
        last_test_preview: result.response_preview ?? "",
      }));
      if (result.success) {
        toast.success(result.message || copy.providerTestSuccess);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.statusFailed);
    } finally {
      setTestingProviderId(null);
    }
  }

  async function handleRefreshProviderCatalog() {
    if (!selectedProvider) {
      return;
    }
    const providerId = asString(selectedProvider.id).trim();
    setRefreshingProviderId(providerId);
    try {
      const result = await loadProviderModels({
        use: asString(selectedProvider.use).trim(),
        api_key: asString(selectedProvider.api_key).trim() || null,
        api_base: asString(selectedProvider.api_base).trim() || null,
        provider_protocol: getProviderProtocol(selectedProvider),
      });
      updateProviderRecord(providerId, (provider) => ({
        ...provider,
        catalog_models: result.models.map((model) =>
          mapProviderModelOptionToConfig(model),
        ),
        catalog_updated_at: new Date().toISOString(),
        catalog_provider_type: result.provider_type,
        catalog_message: result.message,
      }));
      toast.success(result.message || copy.providerCatalogSuccess);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.statusFailed);
    } finally {
      setRefreshingProviderId(null);
    }
  }

  function handleCreateModel() {
    const providerId = selectedProviderId || asString(providers[0]?.id).trim();
    const usedNames = new Set(
      models
        .map((model) => asString(model.name).trim())
        .filter((value) => value.length > 0),
    );
    const nextName = ensureUniqueId(
      toSafeAlias(`model-${models.length + 1}`, `model-${models.length + 1}`),
      usedNames,
    );
    let nextModel: Record<string, unknown> = {
      name: nextName,
      display_name: "",
      description: "",
      model: "",
      provider_id: providerId,
      supports_thinking: false,
      supports_reasoning_effort: false,
      supports_vision: false,
      supports_video: false,
    };
    if (providerId) {
      nextModel = syncModelWithProvider(nextModel, providerId);
    }
    emitNextConfig(providers, [...models, nextModel]);
    setSelectedModelIndex(models.length);
    onViewChange?.("models");
  }

  async function handleInspectModel() {
    if (!selectedModel || selectedModelIndex < 0) {
      return;
    }
    const modelId = asString(selectedModel.model).trim();
    if (!modelId) {
      toast.error(copy.modelId);
      return;
    }
    setInspectingModelIndex(selectedModelIndex);
    try {
      const result = await loadModelMetadata({
        model: modelId,
        use: asString(selectedModel.use).trim(),
        api_base: asString(selectedModel.api_base).trim() || null,
        provider_protocol: (() => {
          const value = asString(selectedModel.provider_protocol).trim();
          if (
            value === "auto"
            || value === "openai-compatible"
            || value === "anthropic-compatible"
          ) {
            return value;
          }
          return undefined;
        })(),
      });
      if (result.success && result.found && result.model) {
        updateSelectedModelRecord((model) => mergeModelMetadata(model, result.model!));
        toast.success(result.message || copy.metadataFilled);
      } else {
        toast.warning(result.message || copy.metadataNotFound);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.statusFailed);
    } finally {
      setInspectingModelIndex(null);
    }
  }

  function handleSetDefaultModel(index: number) {
    const target = models[index];
    if (!target) {
      return;
    }
    const nextModels = models.filter((_, cursor) => cursor !== index);
    nextModels.unshift(target);
    emitNextConfig(providers, nextModels);
    setSelectedModelIndex(0);
  }

  function confirmDeleteProvider() {
    if (!selectedProvider) {
      return;
    }
    const providerName = asString(selectedProvider.name).trim() || selectedProviderId;
    setPendingDeleteAction({
      kind: "provider",
      providerId: selectedProviderId,
      message: copy.confirmDeleteProvider.replace("{name}", providerName),
    });
  }

  function confirmDeleteModel(index: number) {
    const model = models[index];
    if (!model) {
      return;
    }
    const modelName =
      asString(model.display_name).trim()
      || asString(model.name).trim()
      || asString(model.model).trim();
    setPendingDeleteAction({
      kind: "model",
      index,
      message: copy.confirmDeleteModel.replace("{name}", modelName),
    });
  }

  function applyDelete() {
    if (!pendingDeleteAction) {
      return;
    }
    if (pendingDeleteAction.kind === "provider") {
      const provider = providerById.get(pendingDeleteAction.providerId);
      if (!provider) {
        setPendingDeleteAction(null);
        return;
      }
      const nextProviders = providers.filter(
        (item) => asString(item.id).trim() !== pendingDeleteAction.providerId,
      );
      const nextModels = models.map((model) => {
        if (asString(model.provider_id).trim() !== pendingDeleteAction.providerId) {
          return model;
        }
        const nextModel: Record<string, unknown> = {
          ...model,
          provider_id: "",
          use: asString(provider.use).trim(),
          api_key: asString(provider.api_key),
          provider_protocol: getProviderProtocol(provider),
        };
        const apiBase = asString(provider.api_base).trim();
        if (apiBase) {
          nextModel.api_base = apiBase;
        }
        return nextModel;
      });
      emitNextConfig(nextProviders, nextModels);
    } else {
      const nextModels = models.filter(
        (_, index) => index !== pendingDeleteAction.index,
      );
      emitNextConfig(providers, nextModels);
      if (selectedModelIndex >= nextModels.length) {
        setSelectedModelIndex(nextModels.length - 1);
      }
    }
    setPendingDeleteAction(null);
  }

  return (
    <div className="space-y-4">
      {view === "providers" ? (
        <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
          <section className="space-y-3 rounded-xl border p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">{copy.providersTitle}</div>
                <div className="text-muted-foreground text-xs">
                  {copy.providersSubtitle}
                </div>
              </div>
              <Button size="sm" onClick={handleCreateProvider} disabled={disabled}>
                <PlusIcon className="mr-1 size-4" />
                {copy.createProvider}
              </Button>
            </div>

            {providers.length === 0 ? (
              <div className="rounded-lg border border-dashed px-4 py-6 text-sm">
                <div className="font-medium">{copy.noProvider}</div>
                <div className="text-muted-foreground mt-1 text-xs">
                  {copy.noProviderHint}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {providers.map((provider) => {
                  const providerId = asString(provider.id).trim();
                  const boundModels = models.filter(
                    (model) => asString(model.provider_id).trim() === providerId,
                  ).length;
                  const isActive = providerId === selectedProviderId;
                  const lastSuccess =
                    typeof provider.last_test_success === "boolean"
                      ? provider.last_test_success
                      : null;
                  return (
                    <button
                      key={providerId}
                      type="button"
                      onClick={() => setSelectedProviderId(providerId)}
                      className={`w-full rounded-lg border p-3 text-left transition-colors ${
                        isActive
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">
                            {asString(provider.name).trim() || providerId}
                          </div>
                          <div className="text-muted-foreground truncate text-xs">
                            {protocolLabel(getProviderProtocol(provider), copy)}
                          </div>
                        </div>
                        <Badge variant="secondary">
                          {boundModels} {copy.modelCount}
                        </Badge>
                      </div>
                      <div className="text-muted-foreground mt-2 flex items-center gap-2 text-xs">
                        {lastSuccess === true ? (
                          <CircleCheckIcon className="size-3.5 text-emerald-600" />
                        ) : lastSuccess === false ? (
                          <CircleAlertIcon className="size-3.5 text-amber-600" />
                        ) : null}
                        <span>
                          {lastSuccess === true
                            ? copy.statusConnected
                            : lastSuccess === false
                              ? copy.statusFailed
                              : copy.statusUntested}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="space-y-4 rounded-xl border p-4">
            {selectedProvider ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-semibold">
                      {asString(selectedProvider.name).trim() || selectedProviderId}
                    </div>
                    <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-xs">
                      <Badge variant="outline">
                        {protocolLabel(getProviderProtocol(selectedProvider), copy)}
                      </Badge>
                      <span>
                        {copy.modelsBound}:{" "}
                        {
                          models.filter(
                            (model) =>
                              asString(model.provider_id).trim() === selectedProviderId,
                          ).length
                        }
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onViewChange?.("models")}
                    >
                      {copy.openModelsView}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        void handleTestProvider();
                      }}
                      disabled={isDisabled || testingProviderId === selectedProviderId}
                    >
                      {testingProviderId === selectedProviderId
                        ? copy.testingConnection
                        : copy.testConnection}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        void handleRefreshProviderCatalog();
                      }}
                      disabled={
                        isDisabled || refreshingProviderId === selectedProviderId
                      }
                    >
                      <RefreshCcwIcon className="mr-1 size-4" />
                      {refreshingProviderId === selectedProviderId
                        ? copy.fetchingCatalog
                        : copy.refreshCatalog}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={confirmDeleteProvider}
                      disabled={disabled}
                    >
                      <Trash2Icon className="mr-1 size-4" />
                      {copy.deleteProvider}
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <Field label={copy.providerName}>
                    <Input
                      value={asString(selectedProvider.name)}
                      onChange={(event) =>
                        handleProviderFieldChange("name", event.target.value)
                      }
                      disabled={disabled}
                    />
                  </Field>
                  <Field label={copy.providerProtocol}>
                    <Select
                      value={getProviderProtocol(selectedProvider)}
                      onValueChange={(value) =>
                        handleProviderFieldChange("protocol", value)
                      }
                      disabled={disabled}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openai-compatible">
                          {copy.providerProtocolOpenAI}
                        </SelectItem>
                        <SelectItem value="anthropic-compatible">
                          {copy.providerProtocolAnthropic}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label={copy.apiKey}>
                    <Input
                      value={asString(selectedProvider.api_key)}
                      onChange={(event) =>
                        handleProviderFieldChange("api_key", event.target.value)
                      }
                      disabled={disabled}
                    />
                  </Field>
                  <Field label={copy.apiBase}>
                    <Input
                      value={asString(selectedProvider.api_base)}
                      placeholder={copy.apiBasePlaceholder}
                      onChange={(event) =>
                        handleProviderFieldChange("api_base", event.target.value)
                      }
                      disabled={disabled}
                    />
                  </Field>
                  <Field label="use">
                    <Input
                      value={asString(selectedProvider.use)}
                      onChange={(event) =>
                        handleProviderFieldChange("use", event.target.value)
                      }
                      disabled={disabled}
                    />
                  </Field>
                  <Field label={copy.testModel}>
                    <Input
                      value={asString(selectedProvider.test_model)}
                      onChange={(event) =>
                        handleProviderFieldChange("test_model", event.target.value)
                      }
                      disabled={disabled}
                    />
                  </Field>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                  <InfoCard
                    label={copy.lastTestedAt}
                    value={formatLastTestTime(
                      asString(selectedProvider.last_tested_at),
                      locale,
                      copy.notTested,
                    )}
                  />
                  <InfoCard
                    label={copy.catalogUpdatedAt}
                    value={formatLastTestTime(
                      asString(selectedProvider.catalog_updated_at),
                      locale,
                      copy.notTested,
                    )}
                  />
                  <InfoCard
                    label={copy.catalogSource}
                    value={
                      asString(selectedProvider.catalog_provider_type).trim()
                      || copy.manualInput
                    }
                  />
                </div>

                {asString(selectedProvider.last_test_message).trim() && (
                  <div className="rounded-lg border bg-muted/20 px-3 py-2 text-xs">
                    <div className="font-medium">{copy.statusConnected}</div>
                    <div className="text-muted-foreground mt-1">
                      {asString(selectedProvider.last_test_message)}
                    </div>
                    {asString(selectedProvider.last_test_preview).trim() && (
                      <div className="text-muted-foreground mt-2">
                        {copy.lastTestPreview}:{" "}
                        {asString(selectedProvider.last_test_preview)}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <EmptyState
                title={copy.noProvider}
                description={copy.noProviderHint}
                actionLabel={copy.createProvider}
                onAction={handleCreateProvider}
              />
            )}
          </section>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
          <section className="space-y-3 rounded-xl border p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">{copy.modelsTitle}</div>
                <div className="text-muted-foreground text-xs">
                  {copy.modelsSubtitle}
                </div>
              </div>
              <Button size="sm" onClick={handleCreateModel} disabled={disabled}>
                <PlusIcon className="mr-1 size-4" />
                {copy.createModel}
              </Button>
            </div>

            {models.length === 0 ? (
              <EmptyState
                title={copy.noModel}
                description={copy.noModelHint}
                actionLabel={copy.createModel}
                onAction={handleCreateModel}
              />
            ) : (
              <div className="space-y-2">
                {models.map((model, index) => {
                  const isActive = index === selectedModelIndex;
                  const providerId = asString(model.provider_id).trim();
                  const provider = providerId ? providerById.get(providerId) : null;
                  return (
                    <button
                      key={`${asString(model.name)}-${index}`}
                      type="button"
                      onClick={() => setSelectedModelIndex(index)}
                      className={`w-full rounded-lg border p-3 text-left transition-colors ${
                        isActive
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">
                            {asString(model.display_name).trim()
                              || asString(model.name).trim()
                              || asString(model.model).trim()}
                          </div>
                          <div className="text-muted-foreground truncate text-xs">
                            {asString(model.model).trim() || copy.manualInput}
                          </div>
                        </div>
                        {index === 0 && (
                          <Badge>
                            <StarIcon className="mr-1 size-3.5" />
                            {copy.default}
                          </Badge>
                        )}
                      </div>
                      <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-2 text-xs">
                        <Badge variant="outline">
                          {provider
                            ? asString(provider.name).trim()
                            : copy.unassigned}
                        </Badge>
                        {asBoolean(model.supports_thinking) && (
                          <Badge variant="secondary">{copy.supportsThinking}</Badge>
                        )}
                        {asBoolean(model.supports_vision) && (
                          <Badge variant="secondary">{copy.supportsVision}</Badge>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="space-y-4 rounded-xl border p-4">
            {selectedModel ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-semibold">
                      {asString(selectedModel.display_name).trim()
                        || asString(selectedModel.name).trim()
                        || asString(selectedModel.model).trim()
                        || copy.createModel}
                    </div>
                    <div className="text-muted-foreground mt-1 flex flex-wrap gap-2 text-xs">
                      <Badge variant="outline">
                        {selectedModelIndex === 0 ? copy.default : copy.setDefault}
                      </Badge>
                      <Badge variant="outline">
                        {asString(selectedModel.provider_id).trim()
                          ? asString(
                              providerById.get(
                                asString(selectedModel.provider_id).trim(),
                              )?.name,
                            ).trim() || copy.unassigned
                          : copy.unassigned}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedModelIndex !== 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSetDefaultModel(selectedModelIndex)}
                        disabled={disabled}
                      >
                        <StarIcon className="mr-1 size-4" />
                        {copy.setDefault}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        void handleInspectModel();
                      }}
                      disabled={
                        isDisabled || inspectingModelIndex === selectedModelIndex
                      }
                    >
                      <SparklesIcon className="mr-1 size-4" />
                      {inspectingModelIndex === selectedModelIndex
                        ? copy.inspectingModel
                        : copy.inspectModel}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => confirmDeleteModel(selectedModelIndex)}
                      disabled={disabled}
                    >
                      <Trash2Icon className="mr-1 size-4" />
                      {copy.deleteModel}
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <Field label={copy.displayName}>
                    <Input
                      value={asString(selectedModel.display_name)}
                      onChange={(event) =>
                        updateSelectedModelRecord((model) => ({
                          ...model,
                          display_name: event.target.value,
                        }))
                      }
                      disabled={disabled}
                    />
                  </Field>
                  <Field label={copy.modelId}>
                    <Input
                      value={asString(selectedModel.model)}
                      onChange={(event) =>
                        updateSelectedModelRecord((model) => ({
                          ...model,
                          model: event.target.value,
                        }))
                      }
                      disabled={disabled}
                    />
                  </Field>
                  <Field label={copy.internalName}>
                    <Input
                      value={asString(selectedModel.name)}
                      onChange={(event) =>
                        updateSelectedModelRecord((model) => ({
                          ...model,
                          name: toSafeAlias(
                            event.target.value,
                            `model-${selectedModelIndex + 1}`,
                          ),
                        }))
                      }
                      disabled={disabled}
                    />
                  </Field>
                  <Field label={copy.bindProvider}>
                    <Select
                      value={
                        asString(selectedModel.provider_id).trim() || UNASSIGNED_PROVIDER
                      }
                      onValueChange={(value) =>
                        updateSelectedModelRecord((model) => {
                          if (value === UNASSIGNED_PROVIDER) {
                            return { ...model, provider_id: "" };
                          }
                          return syncModelWithProvider(model, value);
                        })
                      }
                      disabled={disabled}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={UNASSIGNED_PROVIDER}>
                          {copy.unassigned}
                        </SelectItem>
                        {providers.map((provider) => {
                          const providerId = asString(provider.id).trim();
                          return (
                            <SelectItem key={providerId} value={providerId}>
                              {asString(provider.name).trim() || providerId}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label={copy.chooseCatalogModel}>
                    <Select
                      value={
                        asCatalogModels(
                          providerById.get(
                            asString(selectedModel.provider_id).trim(),
                          ) ?? {},
                        ).some(
                          (item) => item.id === asString(selectedModel.model).trim(),
                        )
                          ? asString(selectedModel.model).trim()
                          : UNASSIGNED_PROVIDER
                      }
                      onValueChange={(value) =>
                        updateSelectedModelRecord((model) => {
                          if (value === UNASSIGNED_PROVIDER) {
                            return model;
                          }
                          const provider = providerById.get(
                            asString(model.provider_id).trim(),
                          );
                          const option = asCatalogModels(provider ?? {}).find(
                            (item) => item.id === value,
                          );
                          if (!option) {
                            return model;
                          }
                          const displayName = asString(model.display_name).trim();
                          return mergeModelMetadata(
                            {
                              ...model,
                              model: option.id,
                              display_name:
                                displayName !== "" ? displayName : (option.name ?? ""),
                            },
                            option,
                          );
                        })
                      }
                      disabled={disabled}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={copy.manualInput} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={UNASSIGNED_PROVIDER}>
                          {copy.manualInput}
                        </SelectItem>
                        {asCatalogModels(
                          providerById.get(
                            asString(selectedModel.provider_id).trim(),
                          ) ?? {},
                        ).map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name ? `${item.name} (${item.id})` : item.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label={copy.description} className="lg:col-span-2">
                    <Textarea
                      value={asString(selectedModel.description)}
                      onChange={(event) =>
                        updateSelectedModelRecord((model) => ({
                          ...model,
                          description: event.target.value,
                        }))
                      }
                      disabled={disabled}
                      rows={3}
                    />
                  </Field>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                  <Field label={copy.maxTokens}>
                    <Input
                      value={asString(selectedModel.max_tokens)}
                      onChange={(event) =>
                        updateSelectedModelRecord((model) => ({
                          ...model,
                          max_tokens: event.target.value,
                        }))
                      }
                      disabled={disabled}
                      inputMode="numeric"
                    />
                  </Field>
                  <Field label={copy.contextWindow}>
                    <Input
                      value={asString(selectedModel.context_window)}
                      onChange={(event) =>
                        updateSelectedModelRecord((model) => ({
                          ...model,
                          context_window: event.target.value,
                        }))
                      }
                      disabled={disabled}
                      inputMode="numeric"
                    />
                  </Field>
                  <Field label={copy.temperature}>
                    <Input
                      value={asString(selectedModel.temperature)}
                      onChange={(event) =>
                        updateSelectedModelRecord((model) => ({
                          ...model,
                          temperature: event.target.value,
                        }))
                      }
                      disabled={disabled}
                      inputMode="decimal"
                    />
                  </Field>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <SwitchField
                    label={copy.supportsThinking}
                    checked={asBoolean(selectedModel.supports_thinking)}
                    onCheckedChange={(checked) =>
                      updateSelectedModelRecord((model) => ({
                        ...model,
                        supports_thinking: checked,
                      }))
                    }
                    disabled={disabled}
                  />
                  <SwitchField
                    label={copy.supportsReasoningEffort}
                    checked={asBoolean(selectedModel.supports_reasoning_effort)}
                    onCheckedChange={(checked) =>
                      updateSelectedModelRecord((model) => ({
                        ...model,
                        supports_reasoning_effort: checked,
                      }))
                    }
                    disabled={disabled}
                  />
                  <SwitchField
                    label={copy.supportsVision}
                    checked={asBoolean(selectedModel.supports_vision)}
                    onCheckedChange={(checked) =>
                      updateSelectedModelRecord((model) => ({
                        ...model,
                        supports_vision: checked,
                      }))
                    }
                    disabled={disabled}
                  />
                  <SwitchField
                    label={copy.supportsVideo}
                    checked={asBoolean(selectedModel.supports_video)}
                    onCheckedChange={(checked) =>
                      updateSelectedModelRecord((model) => ({
                        ...model,
                        supports_video: checked,
                      }))
                    }
                    disabled={disabled}
                  />
                </div>
              </>
            ) : (
              <EmptyState
                title={copy.noModel}
                description={copy.noModelHint}
                actionLabel={copy.createModel}
                onAction={handleCreateModel}
              />
            )}
          </section>
        </div>
      )}

      <ConfirmActionDialog
        open={pendingDeleteAction !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeleteAction(null);
          }
        }}
        title={copy.confirmDeleteTitle}
        description={pendingDeleteAction?.message ?? ""}
        confirmText={copy.confirmDeleteAction}
        confirmVariant="destructive"
        onConfirm={applyDelete}
      />
    </div>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`space-y-2 ${className ?? ""}`}>
      <div className="text-xs font-medium">{label}</div>
      {children}
    </label>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/10 p-3">
      <div className="text-muted-foreground text-[11px]">{label}</div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}

function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="rounded-lg border border-dashed px-4 py-6 text-sm">
      <div className="font-medium">{title}</div>
      <div className="text-muted-foreground mt-1 text-xs">{description}</div>
      <Button size="sm" className="mt-4" onClick={onAction}>
        <PlusIcon className="mr-1 size-4" />
        {actionLabel}
      </Button>
    </div>
  );
}

function SwitchField({
  label,
  checked,
  disabled,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border px-3 py-2">
      <div className="text-sm">{label}</div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
}
