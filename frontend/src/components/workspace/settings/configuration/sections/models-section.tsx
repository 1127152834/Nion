"use client";

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronsUpDownIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  EyeIcon,
  EyeOffIcon,
  PlusIcon,
  PlugZapIcon,
  SearchIcon,
  SparklesIcon,
  StarIcon,
  Trash2Icon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/core/i18n/hooks";
import { loadProviderSecretValue } from "@/core/model-admin/api";
import {
  loadModelMetadata,
  loadProviderModels,
  testModelConnection,
} from "@/core/models/api";
import type { ProviderModelOption } from "@/core/models/types";
import { cn } from "@/lib/utils";

import { ConfirmActionDialog } from "../../confirm-action-dialog";
import {
  buildDraftProviderConnectionSignature,
  hasDraftProviderConnectionChanges,
} from "../../model-management/provider-connection";
import {
  asArray,
  asBoolean,
  asString,
  cloneConfig,
  type ConfigDraft,
} from "../shared";

const MODEL_PROVIDERS_KEY = "model_providers";
const OPENAI_PROVIDER_PRESET = "openai-compatible";
const ANTHROPIC_PROVIDER_PRESET = "anthropic-compatible";
const UNASSIGNED_PROVIDER = "__unassigned_provider__";

export type ModelSettingsChildView = "providers" | "models";
type ProviderProtocol = "openai-compatible" | "anthropic-compatible";

type ProviderPreset = {
  id: string;
  label: string;
  use?: string;
  protocol: ProviderProtocol;
  defaultApiBase?: string;
  apiKeyHint?: string;
  defaultTestModel?: string;
  descriptionZh?: string;
  descriptionEn?: string;
};

type ProviderFeedback = {
  success: boolean;
  message: string;
  latencyMs?: number | null;
  responsePreview?: string | null;
};

type ProviderCatalogModel = {
  id: string;
  name?: string;
  supports_thinking?: boolean | null;
  supports_vision?: boolean | null;
  supports_video?: boolean | null;
  context_window?: number | null;
  max_output_tokens?: number | null;
  source?: string;
};

type PendingDeleteAction =
  | {
      kind: "provider";
      providerId: string;
      message: string;
    }
  | {
      kind: "model";
      index: number;
      message: string;
      afterDelete?: () => void;
    };

const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: OPENAI_PROVIDER_PRESET,
    label: "OpenAI",
    use: "langchain_openai:ChatOpenAI",
    protocol: "openai-compatible",
    apiKeyHint: "$OPENAI_API_KEY",
    defaultApiBase: "https://api.openai.com/v1",
    defaultTestModel: "gpt-4o-mini",
    descriptionZh: "适用于 OpenAI、OpenRouter、多数兼容 OpenAI 的 API。",
    descriptionEn: "For OpenAI, OpenRouter, and most OpenAI-compatible APIs.",
  },
  {
    id: ANTHROPIC_PROVIDER_PRESET,
    label: "Anthropic",
    use: "langchain_anthropic:ChatAnthropic",
    protocol: "anthropic-compatible",
    apiKeyHint: "$ANTHROPIC_API_KEY",
    defaultApiBase: "https://api.anthropic.com",
    defaultTestModel: "claude-3-5-sonnet-latest",
    descriptionZh: "适用于 Anthropic 及 Anthropic 兼容网关（如 MiniMax /anthropic）。",
    descriptionEn: "For Anthropic and Anthropic-compatible gateways (e.g. MiniMax /anthropic).",
  },
];

function defaultUseByProtocol(protocol: ProviderProtocol): string {
  return protocol === "anthropic-compatible"
    ? "langchain_anthropic:ChatAnthropic"
    : "langchain_openai:ChatOpenAI";
}

function inferProtocolFromUse(use: string): ProviderProtocol {
  const normalized = use.trim().toLowerCase();
  return normalized.includes("anthropic")
    ? "anthropic-compatible"
    : "openai-compatible";
}

function normalizeProviderProtocol(value: string): ProviderProtocol {
  const normalized = value.trim().toLowerCase();
  if (normalized === "anthropic" || normalized === "anthropic-compatible") {
    return "anthropic-compatible";
  }
  return "openai-compatible";
}

function protocolLabel(protocol: ProviderProtocol, isZh: boolean): string {
  if (protocol === "anthropic-compatible") {
    return isZh ? "Anthropic 兼容" : "Anthropic Compatible";
  }
  return isZh ? "OpenAI 兼容" : "OpenAI Compatible";
}

function parseNumberInput(value: string): number | undefined {
  if (!value.trim()) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toSafeAlias(value: string, fallbackPrefix: string): string {
  const alias = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return alias || fallbackPrefix;
}

function buildProviderSignature(record: Record<string, unknown>): string {
  return [
    asString(record.use).trim(),
    asString(record.api_base).trim(),
    asString(record.api_key).trim(),
  ].join("|||");
}

function asProviders(config: ConfigDraft): Record<string, unknown>[] {
  return asArray(config[MODEL_PROVIDERS_KEY]);
}

function getPresetById(presetId: string): ProviderPreset | undefined {
  return PROVIDER_PRESETS.find((preset) => preset.id === presetId);
}

function detectPresetId(use: string, apiBase?: string): string {
  const useLower = use.trim().toLowerCase();
  const apiBaseLower = (apiBase ?? "").trim().toLowerCase();
  if (apiBaseLower.includes("anthropic")) {
    return ANTHROPIC_PROVIDER_PRESET;
  }
  if (useLower.includes("anthropic")) {
    return ANTHROPIC_PROVIDER_PRESET;
  }
  return OPENAI_PROVIDER_PRESET;
}

function ensureUniqueId(baseId: string, used: Set<string>): string {
  if (!used.has(baseId)) {
    used.add(baseId);
    return baseId;
  }
  let cursor = 2;
  while (used.has(`${baseId}-${cursor}`)) {
    cursor += 1;
  }
  const unique = `${baseId}-${cursor}`;
  used.add(unique);
  return unique;
}

function inferProviderLabelFromUse(use: string, index: number): string {
  const preset = getPresetById(detectPresetId(use));
  return preset?.label ?? `Provider ${index + 1}`;
}

function normalizeCatalogModel(item: Record<string, unknown>): ProviderCatalogModel {
  const contextWindow = parseNumberInput(asString(item.context_window));
  const maxOutputTokens = parseNumberInput(asString(item.max_output_tokens));
  return {
    id: asString(item.id).trim(),
    name: asString(item.name).trim() || undefined,
    supports_thinking:
      typeof item.supports_thinking === "boolean"
        ? item.supports_thinking
        : null,
    supports_vision:
      typeof item.supports_vision === "boolean"
        ? item.supports_vision
        : null,
    supports_video:
      typeof item.supports_video === "boolean"
        ? item.supports_video
        : null,
    context_window: contextWindow ?? null,
    max_output_tokens: maxOutputTokens ?? null,
    source: asString(item.source).trim() || undefined,
  };
}

function asCatalogModels(provider: Record<string, unknown>): ProviderCatalogModel[] {
  return asArray(provider.catalog_models)
    .map((item) => normalizeCatalogModel(item))
    .filter((item) => item.id.length > 0);
}

function getProviderProtocol(provider: Record<string, unknown>): ProviderProtocol {
  const providerUse = asString(provider.use).trim();
  return normalizeProviderProtocol(
    asString(provider.protocol).trim()
    || inferProtocolFromUse(providerUse),
  );
}

function normalizeProviderList(
  rawProviders: Record<string, unknown>[],
): Record<string, unknown>[] {
  const usedIds = new Set<string>();

  return rawProviders.map((provider, index) => {
    const rawUse = asString(provider.use).trim();
    const rawApiBase = asString(provider.api_base).trim();
    const detectedPresetId = detectPresetId(rawUse, rawApiBase);
    const presetId = asString(provider.preset_id).trim() || detectedPresetId;
    const preset = getPresetById(presetId) ?? getPresetById(OPENAI_PROVIDER_PRESET);
    const explicitProtocol = asString(provider.protocol).trim();
    const providerProtocol = normalizeProviderProtocol(
      explicitProtocol !== ""
        ? explicitProtocol
        : (preset?.protocol ?? inferProtocolFromUse(rawUse)),
    );

    const providerUse =
      rawUse.length > 0
        ? rawUse
        : (preset?.use ?? defaultUseByProtocol(providerProtocol));

    const providerId = ensureUniqueId(
      toSafeAlias(
        asString(provider.id).trim()
          || asString(provider.name).trim()
          || `provider-${index + 1}`,
        `provider-${index + 1}`,
      ),
      usedIds,
    );

    const defaultApiBase = preset?.defaultApiBase ?? "";
    const providerApiBase = rawApiBase || defaultApiBase;
    const hasExplicitNameField = Object.prototype.hasOwnProperty.call(provider, "name");
    const providerName = hasExplicitNameField
      ? asString(provider.name)
      : inferProviderLabelFromUse(providerUse, index);

    const catalogModels = asCatalogModels(provider);

    return {
      ...provider,
      id: providerId,
      name: providerName,
      preset_id: presetId,
      protocol: providerProtocol,
      use: providerUse,
      api_key: asString(provider.api_key),
      api_key_masked: asString(provider.api_key_masked),
      api_key_present: asBoolean(provider.api_key_present, false),
      api_key_dirty: asBoolean(provider.api_key_dirty, false),
      api_base: providerApiBase,
      test_model: asString(provider.test_model).trim(),
      catalog_models: catalogModels.map((item) => ({
        id: item.id,
        name: item.name ?? "",
        supports_thinking: item.supports_thinking,
        supports_vision: item.supports_vision,
        supports_video: item.supports_video,
        context_window: item.context_window,
        max_output_tokens: item.max_output_tokens,
        source: item.source ?? "",
      })),
      catalog_updated_at: asString(provider.catalog_updated_at),
      catalog_provider_type: asString(provider.catalog_provider_type),
      catalog_message: asString(provider.catalog_message),
      last_test_status: asString(provider.last_test_status),
      last_test_signature: asString(provider.last_test_signature),
    };
  });
}

function deriveProvidersFromModels(
  models: Record<string, unknown>[],
): Record<string, unknown>[] {
  const signatureToProvider = new Map<string, Record<string, unknown>>();
  const usedIds = new Set<string>();

  models.forEach((model, index) => {
    const signature = buildProviderSignature(model);
    const use = asString(model.use).trim();
    if (!use || signatureToProvider.has(signature)) {
      return;
    }

    const presetId = detectPresetId(use, asString(model.api_base).trim());
    const preset = getPresetById(presetId);
    const baseId = toSafeAlias(
      asString(model.provider_id).trim()
        || asString(model.name).trim()
        || `provider-${index + 1}`,
      `provider-${index + 1}`,
    );

    const providerId = ensureUniqueId(baseId, usedIds);
    signatureToProvider.set(signature, {
      id: providerId,
      name: inferProviderLabelFromUse(use, signatureToProvider.size),
      preset_id: presetId,
      protocol: inferProtocolFromUse(use),
      use,
      api_key: asString(model.api_key),
      api_base:
        asString(model.api_base).trim().length > 0
          ? asString(model.api_base).trim()
          : (preset?.defaultApiBase ?? ""),
      test_model: "",
      catalog_models: [],
      catalog_updated_at: "",
      catalog_provider_type: "",
      catalog_message: "",
    });
  });

  return [...signatureToProvider.values()];
}

export function normalizeModelProviderConfig(config: ConfigDraft): ConfigDraft {
  const next = cloneConfig(config);
  const rawModels = asArray(next.models);
  const initialProviders = asProviders(next);

  const providersFromConfig =
    initialProviders.length > 0
      ? normalizeProviderList(initialProviders)
      : normalizeProviderList(deriveProvidersFromModels(rawModels));

  const providerById = new Map<string, Record<string, unknown>>();
  const signatureToProviderId = new Map<string, string>();
  providersFromConfig.forEach((provider) => {
    const providerId = asString(provider.id).trim();
    if (!providerId) {
      return;
    }
    providerById.set(providerId, provider);
    signatureToProviderId.set(buildProviderSignature(provider), providerId);
  });

  const normalizedModels = rawModels.map((model, index) => {
    let providerId = asString(model.provider_id).trim();
    if (!providerId || !providerById.has(providerId)) {
      providerId = signatureToProviderId.get(buildProviderSignature(model)) ?? "";
    }

    const selectedProvider = providerId ? providerById.get(providerId) : undefined;
    const normalizedName = toSafeAlias(
      asString(model.name).trim()
        || asString(model.model).trim()
        || `model-${index + 1}`,
      `model-${index + 1}`,
    );
    const normalizedModel: Record<string, unknown> = {
      ...model,
      name: normalizedName,
      provider_id: providerId,
    };

    if (selectedProvider) {
      const providerUse = asString(selectedProvider.use).trim();
      const providerApiKey = asString(selectedProvider.api_key);
      const providerApiBase = asString(selectedProvider.api_base).trim();
      const providerProtocol = normalizeProviderProtocol(
        asString(selectedProvider.protocol).trim()
        || inferProtocolFromUse(providerUse),
      );
      normalizedModel.use = providerUse;
      normalizedModel.api_key = providerApiKey;
      normalizedModel.provider_protocol = providerProtocol;
      if (providerApiBase) {
        normalizedModel.api_base = providerApiBase;
      } else {
        delete normalizedModel.api_base;
      }
    }

    return normalizedModel;
  });

  const normalizedProviders = providersFromConfig.map((provider) => ({
    ...provider,
    test_model: asString(provider.test_model).trim(),
  }));

  next[MODEL_PROVIDERS_KEY] = normalizedProviders;
  next.models = normalizedModels;
  return next;
}

function mapProviderModelOptionToConfig(
  model: ProviderModelOption,
): Record<string, unknown> {
  return {
    id: model.id,
    name: model.name ?? "",
    supports_thinking:
      typeof model.supports_thinking === "boolean"
        ? model.supports_thinking
        : null,
    supports_vision:
      typeof model.supports_vision === "boolean"
        ? model.supports_vision
        : null,
    supports_video:
      typeof model.supports_video === "boolean"
        ? model.supports_video
        : null,
    context_window:
      typeof model.context_window === "number" ? model.context_window : null,
    max_output_tokens:
      typeof model.max_output_tokens === "number"
        ? model.max_output_tokens
        : null,
    source: model.source ?? "",
  };
}


type ProviderPanelView = "list" | "create" | "edit";
type ModelPanelView = "list" | "create" | "edit";
type ProviderDetailView = "details" | "models";
type ModelViewContext = "global" | "provider";

type ProviderDraft = {
  name: string;
  protocol: ProviderProtocol;
  api_key: string;
  api_base: string;
  use: string;
};

function createProviderDraft(
  protocol: ProviderProtocol,
  providerIndex: number,
  isZh: boolean,
): ProviderDraft {
  const preset = getPresetById(
    protocol === "anthropic-compatible"
      ? ANTHROPIC_PROVIDER_PRESET
      : OPENAI_PROVIDER_PRESET,
  );
  const defaultName = protocol === "anthropic-compatible"
    ? (isZh
      ? `Anthropic 兼容供应商 ${providerIndex}`
      : `Anthropic Compatible Provider ${providerIndex}`)
    : (isZh
      ? `OpenAI 兼容供应商 ${providerIndex}`
      : `OpenAI Compatible Provider ${providerIndex}`);

  return {
    name: defaultName,
    protocol,
    api_key: "",
    api_base: preset?.defaultApiBase ?? "",
    use: preset?.use ?? defaultUseByProtocol(protocol),
  };
}

function formatLastTestTime(raw: string, locale: string): string {
  const value = raw.trim();
  if (!value) {
    return locale === "zh-CN" ? "未测试" : "Not tested";
  }
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return value;
  }
  return new Date(timestamp).toLocaleString(locale);
}

function getProviderApiKeyDisplay(provider: Record<string, unknown>): string {
  const current = asString(provider.api_key).trim();
  if (current !== "") {
    return current;
  }
  const masked = asString(provider.api_key_masked).trim();
  if (masked !== "") {
    return masked;
  }
  const length = Number(provider.api_key_length);
  return Number.isFinite(length) && length > 0
    ? "•".repeat(length)
    : "";
}

function isFieldBlank(value: unknown): boolean {
  if (value === undefined || value === null) {
    return true;
  }
  if (typeof value === "string") {
    return value.trim() === "";
  }
  return false;
}

function mergeModelMetadata(
  current: Record<string, unknown>,
  metadata: ProviderModelOption,
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...current };

  if (
    typeof metadata.supports_thinking === "boolean"
    && isFieldBlank(current.supports_thinking)
  ) {
    next.supports_thinking = metadata.supports_thinking;
  }

  if (
    typeof metadata.supports_vision === "boolean"
    && isFieldBlank(current.supports_vision)
  ) {
    next.supports_vision = metadata.supports_vision;
  }

  if (
    typeof metadata.supports_video === "boolean"
    && isFieldBlank(current.supports_video)
  ) {
    next.supports_video = metadata.supports_video;
  }

  if (
    typeof metadata.max_output_tokens === "number"
    && parseNumberInput(asString(current.max_tokens)) === undefined
  ) {
    next.max_tokens = metadata.max_output_tokens;
  }

  if (
    typeof metadata.context_window === "number"
    && parseNumberInput(asString(current.context_window)) === undefined
  ) {
    next.context_window = metadata.context_window;
  }

  if (isFieldBlank(current.display_name) && asString(metadata.name).trim() !== "") {
    next.display_name = metadata.name;
  }

  return next;
}

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
  const { locale } = useI18n();
  const isZh = locale === "zh-CN";
  const preparedConfig = useMemo(
    () => normalizeModelProviderConfig(config),
    [config],
  );
  const providers = asProviders(preparedConfig);
  const models = asArray(preparedConfig.models);

  const [providerPanelView, setProviderPanelView] = useState<ProviderPanelView>(
    providers.length > 0 ? "list" : "create",
  );
  const [selectedProviderId, setSelectedProviderId] = useState(
    asString(providers[0]?.id).trim(),
  );
  const [createDraft, setCreateDraft] = useState<ProviderDraft>(() =>
    createProviderDraft("openai-compatible", 1, isZh),
  );
  const [createFeedback, setCreateFeedback] = useState<ProviderFeedback | null>(null);
  const [createApiKeyVisible, setCreateApiKeyVisible] = useState(false);
  const [editApiKeyVisible, setEditApiKeyVisible] = useState(false);

  const [providerFeedback, setProviderFeedback] = useState<Record<string, ProviderFeedback>>({});
  const [testingProviderKey, setTestingProviderKey] = useState<string | null>(null);
  const [loadingCatalogProviderId, setLoadingCatalogProviderId] = useState<string | null>(null);
  const [loadingProviderSecretId, setLoadingProviderSecretId] = useState<string | null>(null);

  const [providerDetailView, setProviderDetailView] = useState<ProviderDetailView>("details");
  const [modelViewContext, setModelViewContext] = useState<ModelViewContext>("global");
  const [modelAdvancedOpen, setModelAdvancedOpen] = useState<Record<number, boolean>>({});
  const [modelIdPickerOpen, setModelIdPickerOpen] = useState<Record<number, boolean>>({});
  const [modelIdSearch, setModelIdSearch] = useState<Record<number, string>>({});
  const [manualModelInputByIndex, setManualModelInputByIndex] = useState<Record<number, boolean>>({});
  const [modelPanelView, setModelPanelView] = useState<ModelPanelView>(
    "list",
  );
  const [selectedModelIndex, setSelectedModelIndex] = useState(0);
  const [providerModelDialogOpen, setProviderModelDialogOpen] = useState(false);

  const [catalogSelectedProviderId, setCatalogSelectedProviderId] = useState(
    asString(providers[0]?.id).trim(),
  );
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogSelectedModelIds, setCatalogSelectedModelIds] = useState<string[]>([]);
  const [addingCatalogModels, setAddingCatalogModels] = useState(false);
  const [inspectingModelKey, setInspectingModelKey] = useState<string | null>(null);
  const [pendingDeleteAction, setPendingDeleteAction] =
    useState<PendingDeleteAction | null>(null);

  const copy = {
    providersTitle: isZh ? "供应商" : "Providers",
    providersSubtitle: isZh
      ? "先管理连接，再在供应商中添加模型。"
      : "Set up provider connections, then add models inside each provider.",
    createProvider: isZh ? "新增供应商" : "New Provider",
    providerDetailTitle: isZh ? "供应商详情" : "Provider Details",
    createDetailTitle: isZh ? "新增供应商" : "Create Provider",
    providerName: isZh ? "供应商名称" : "Provider Name",
    providerNamePlaceholder: isZh ? "例如：生产环境 OpenAI" : "e.g. OpenAI Production",
    providerProtocol: isZh ? "协议" : "Protocol",
    providerProtocolOpenAI: isZh ? "OpenAI 兼容" : "OpenAI Compatible",
    providerProtocolAnthropic: isZh ? "Anthropic 兼容" : "Anthropic Compatible",
    apiKey: isZh ? "API Key / 环境变量" : "API Key / Env Var",
    apiBase: isZh ? "API Base" : "API Base",
    apiBasePlaceholder: isZh
      ? "例如：https://api.openai.com/v1"
      : "e.g. https://api.openai.com/v1",
    apiBasePlaceholderAnthropic: isZh
      ? "例如：https://api.anthropic.com 或 https://api.minimaxi.com/anthropic"
      : "e.g. https://api.anthropic.com or https://api.minimaxi.com/anthropic",
    showApiKey: isZh ? "显示密钥" : "Show API key",
    hideApiKey: isZh ? "隐藏密钥" : "Hide API key",
    testConnection: isZh ? "测试连接" : "Test Connection",
    testingConnection: isZh ? "测试中..." : "Testing...",
    fetchingCatalog: isZh ? "刷新中..." : "Refreshing...",
    saveProvider: isZh ? "保存供应商" : "Save Provider",
    deleteProvider: isZh ? "删除供应商" : "Delete Provider",
    remove: isZh ? "删除" : "Remove",
    confirmDeleteTitle: isZh ? "确认删除" : "Confirm Deletion",
    confirmDeleteAction: isZh ? "确认删除" : "Delete",
    confirmDeleteProvider: isZh
      ? "确认删除供应商「{name}」吗？该供应商下的模型将被重绑定或清空。"
      : "Delete provider \"{name}\"? Models under this provider will be re-bound or cleared.",
    confirmDeleteModel: isZh
      ? "确认删除模型「{name}」吗？"
      : "Delete model \"{name}\"?",
    advanced: isZh ? "高级配置" : "Advanced",
    backToProviderList: isZh ? "返回供应商列表" : "Back to Providers",
    openProviderModels: isZh ? "模型列表" : "Model List",
    backToProviderDetail: isZh ? "返回供应商详情" : "Back to provider details",
    openProvider: isZh ? "编辑" : "Edit",
    statusConnected: isZh ? "已连接" : "Connected",
    statusFailed: isZh ? "连接失败" : "Failed",
    statusUntested: isZh ? "未测试" : "Untested",
    lastTestedAt: isZh ? "最近测试" : "Last tested",
    modelCount: isZh ? "模型数" : "Models",
    noProvider: isZh ? "暂无供应商，请先新增。" : "No providers yet.",
    noProviderCtaTitle: isZh ? "先新增一个供应商" : "Create your first provider",
    noProviderCtaHint: isZh
      ? "先创建供应商，再添加模型。"
      : "Create a provider first, then add models.",
    goCreateProvider: isZh ? "去新增供应商" : "Create Provider",
    modelsTitle: isZh ? "模型" : "Models",
    modelsSubtitle: isZh
      ? "只用于查看模型与设置默认模型。"
      : "View models and set the default model only.",
    modelListTitle: isZh ? "模型列表" : "Model List",
    modelListSubtitle: isZh
      ? "可设置默认模型，也可直接删除不需要的模型。"
      : "Set default model or remove models you no longer need.",
    createModel: isZh ? "新增模型" : "New Model",
    createModelTitle: isZh ? "新增模型" : "Create Model",
    editModelTitle: isZh ? "模型详情" : "Model Details",
    backToModelList: isZh ? "返回模型列表" : "Back to Models",
    noModelOnList: isZh
      ? "暂无模型，请先在供应商中添加。"
      : "No models yet. Add models in provider settings first.",
    openModel: isZh ? "编辑" : "Edit",
    capabilityReasoning: isZh ? "推理" : "Reasoning",
    capabilityVision: isZh ? "图像" : "Vision",
    capabilityVideo: isZh ? "视频" : "Video",
    addFlowTitle: isZh ? "添加模型" : "Add Models",
    addFlowHint: isZh
      ? "选择供应商与添加方式。"
      : "Choose provider and input mode.",
    stepChooseProvider: isZh ? "步骤 1：选择供应商" : "Step 1: Choose Provider",
    stepChooseSource: isZh ? "步骤 2：选择添加方式" : "Step 2: Choose Source",
    stepAddAction: isZh ? "步骤 3：添加模型" : "Step 3: Add Model",
    stepChooseProviderHint: isZh
      ? "先选供应商，并可刷新该供应商的模型列表。"
      : "Pick provider first and refresh its model list if needed.",
    stepChooseSourceHint: isZh
      ? "供应商有模型目录时可从列表添加，否则使用手动输入。"
      : "Use catalog when available, otherwise switch to manual input.",
    stepAddActionHint: isZh
      ? "添加后会自动探测模型参数并回填能力。"
      : "Model metadata will be auto-detected after adding.",
    selectProviderFirstHint: isZh
      ? "请先选择供应商。"
      : "Please choose a provider first.",
    providerModelsTitle: isZh ? "该供应商模型" : "Provider Models",
    providerModelsSubtitle: isZh
      ? "在供应商内新增或删除模型。"
      : "Add or remove models within this provider.",
    addProviderModel: isZh ? "添加模型" : "Add Model",
    addProviderModelDialogTitle: isZh ? "添加模型" : "Add Models",
    addProviderModelDialogDesc: isZh
      ? "搜索并勾选模型；输入后按回车可直接添加手动模型 ID。"
      : "Search and select models; press Enter to add a custom model ID.",
    backToProviderModels: isZh ? "返回模型列表" : "Back to models",
    noProviderModels: isZh ? "该供应商暂无模型。" : "No models in this provider.",
    usingProvider: isZh ? "当前供应商" : "Current Provider",
    selectProvider: isZh ? "选择供应商" : "Select Provider",
    searchModel: isZh ? "搜索模型..." : "Search models...",
    enterToAddModel: isZh ? "按 Enter 添加手动模型 ID" : "Press Enter to add custom model ID",
    quickAddLabel: isZh ? "直接添加" : "Quick add",
    selected: isZh ? "已选" : "Selected",
    selectedModelsEmpty: isZh ? "还没有已选模型" : "No selected models yet",
    manualAddedTag: isZh ? "手动添加" : "Manual",
    addSelectedModels: isZh ? "添加模型" : "Add Models",
    manualInput: isZh ? "手动输入模型" : "Manual Input",
    catalogInput: isZh ? "从列表选择" : "Catalog Select",
    adding: isZh ? "添加中..." : "Adding...",
    noCatalog: isZh
      ? "该供应商未提供模型列表，可直接输入模型 ID 并回车添加。"
      : "No catalog from provider. Type model ID and press Enter.",
    noModel: isZh ? "还没有模型，请先添加。" : "No models configured yet.",
    modelName: isZh ? "显示名称" : "Display Name",
    modelNamePlaceholder: isZh ? "例如：GPT-4o Mini" : "e.g. GPT-4o Mini",
    modelId: isZh ? "模型 ID" : "Model ID",
    modelIdPlaceholder: isZh ? "例如：gpt-4o-mini" : "e.g. gpt-4o-mini",
    bindProvider: isZh ? "供应商" : "Provider",
    unassigned: isZh ? "未绑定" : "Unassigned",
    legacyImported: isZh ? "历史配置" : "Legacy config",
    setDefault: isZh ? "设为默认" : "Set Default",
    default: isZh ? "默认" : "Default",
    internalName: isZh ? "内部标识" : "Internal Name",
    internalNamePlaceholder: isZh ? "自动生成，可手动修改" : "Auto-generated, editable",
    maxTokens: isZh ? "最大输出 Token" : "Max Output Tokens",
    contextWindow: isZh ? "上下文窗口" : "Context Window",
    temperature: isZh ? "温度" : "Temperature",
    supportsThinking: isZh ? "支持深度推理" : "Supports Reasoning",
    supportsVision: isZh ? "支持图片理解" : "Supports Vision",
    supportsVideo: isZh ? "支持视频理解" : "Supports Video",
    expandDetails: isZh ? "展开详情" : "Expand",
    collapseDetails: isZh ? "收起详情" : "Collapse",
    inspectModel: isZh ? "检查参数" : "Check Params",
    inspectingModel: isZh ? "检查中..." : "Checking...",
    modelMissingRequired: isZh ? "必填项未完成" : "Missing required fields",
    duplicateModelName: isZh ? "内部标识重复" : "Duplicate internal name",
    testSuccess: isZh ? "连接成功" : "Connected",
    testFailed: isZh ? "连接失败" : "Connection failed",
    requireProviderForManualAdd: isZh ? "请先选择供应商。" : "Please choose a provider first.",
    requireModelIdForManualAdd: isZh ? "请先填写模型 ID。" : "Please fill model ID first.",
    duplicateModelHint: isZh ? "该模型已存在，无需重复添加。" : "Model already exists.",
    metadataFilled: isZh ? "模型参数已自动补全。" : "Model parameters were auto-filled.",
    metadataNotFound: isZh ? "未命中 models.dev，未修改字段。" : "No models.dev match. No field changed.",
    inspectRequiresProvider: isZh ? "请先绑定供应商后再检查。" : "Bind provider before checking.",
    inspectRequiresModelId: isZh ? "请先填写模型 ID。" : "Fill model ID before checking.",
    modelListCollapsedHint: isZh
      ? "模型详情默认折叠，点击“展开详情”进行编辑。"
      : "Model details are collapsed by default. Click Expand to edit.",
  };

  const modelNameCount = useMemo(() => {
    const counter = new Map<string, number>();
    models.forEach((model) => {
      const name = asString(model.name).trim();
      if (!name) {
        return;
      }
      counter.set(name, (counter.get(name) ?? 0) + 1);
    });
    return counter;
  }, [models]);

  const providerById = useMemo(() => {
    const map = new Map<string, Record<string, unknown>>();
    providers.forEach((provider) => {
      const providerId = asString(provider.id).trim();
      if (!providerId) {
        return;
      }
      map.set(providerId, provider);
    });
    return map;
  }, [providers]);

  const providerOptions = useMemo(
    () =>
      providers
        .map((provider) => {
          const providerId = asString(provider.id).trim();
          if (!providerId) {
            return null;
          }
          return {
            id: providerId,
            name: asString(provider.name).trim() || providerId,
          };
        })
        .filter((item): item is { id: string; name: string } => item !== null),
    [providers],
  );

  const providerProtocolById = useMemo(() => {
    const map = new Map<string, ProviderProtocol>();
    providers.forEach((provider) => {
      const providerId = asString(provider.id).trim();
      if (!providerId) {
        return;
      }
      map.set(providerId, getProviderProtocol(provider));
    });
    return map;
  }, [providers]);

  const providerNameById = useMemo(() => {
    const map = new Map<string, string>();
    providers.forEach((provider) => {
      const providerId = asString(provider.id).trim();
      if (!providerId) {
        return;
      }
      map.set(providerId, asString(provider.name).trim() || providerId);
    });
    return map;
  }, [providers]);

  const configuredModelCountByProviderId = useMemo(() => {
    const map = new Map<string, number>();
    models.forEach((model) => {
      const providerId = asString(model.provider_id).trim();
      if (!providerId) {
        return;
      }
      map.set(providerId, (map.get(providerId) ?? 0) + 1);
    });
    return map;
  }, [models]);

  const providerCatalogMap = useMemo(() => {
    const map = new Map<string, ProviderCatalogModel[]>();
    providers.forEach((provider) => {
      const providerId = asString(provider.id).trim();
      if (!providerId) {
        return;
      }
      map.set(providerId, asCatalogModels(provider));
    });
    return map;
  }, [providers]);

  const selectedProviderIndex = useMemo(
    () => providers.findIndex((provider) => asString(provider.id).trim() === selectedProviderId),
    [providers, selectedProviderId],
  );

  const selectedProvider = selectedProviderIndex >= 0
    ? providers[selectedProviderIndex]
    : null;

  const activeCatalogProviderId =
    catalogSelectedProviderId.trim() !== ""
      ? catalogSelectedProviderId
      : (providerOptions[0]?.id ?? "");

  useEffect(() => {
    if (providers.length === 0) {
      setProviderPanelView("create");
      setSelectedProviderId("");
      return;
    }

    const providerExists = providers.some(
      (provider) => asString(provider.id).trim() === selectedProviderId,
    );
    if (!providerExists) {
      setSelectedProviderId(asString(providers[0]?.id).trim());
    }

    if (providerPanelView === "create" && selectedProviderId.trim() === "") {
      setProviderPanelView("list");
    }

    if (providerPanelView === "edit" && !providerExists) {
      setProviderPanelView("list");
    }
  }, [providerPanelView, providers, selectedProviderId]);

  useEffect(() => {
    const current = catalogSelectedProviderId.trim();
    if (current && providerById.has(current)) {
      return;
    }
    setCatalogSelectedProviderId(providerOptions[0]?.id ?? "");
  }, [catalogSelectedProviderId, providerById, providerOptions]);

  useEffect(() => {
    if (models.length === 0) {
      setModelPanelView("list");
      setSelectedModelIndex(0);
      return;
    }

    if (selectedModelIndex >= models.length) {
      setSelectedModelIndex(0);
    }

    if (modelPanelView === "edit" && selectedModelIndex >= models.length) {
      setModelPanelView("list");
    }
  }, [modelPanelView, models.length, selectedModelIndex]);

  useEffect(() => {
    setProviderDetailView("details");
    setModelViewContext("global");
    setProviderModelDialogOpen(false);
  }, [providerPanelView, selectedProviderId]);

  useEffect(() => {
    if (view !== "providers" || modelViewContext !== "provider") {
      return;
    }
    setProviderDetailView("details");
    setModelViewContext("global");
    setProviderModelDialogOpen(false);
  }, [modelViewContext, view]);

  useEffect(() => {
    if (providerPanelView === "create") {
      setCreateApiKeyVisible(false);
      return;
    }
    setEditApiKeyVisible(false);
  }, [providerPanelView, selectedProviderId]);

  const updatePreparedConfig = (mutator: (next: ConfigDraft) => void) => {
    const next = cloneConfig(preparedConfig);
    mutator(next);
    onChange(next);
  };

  const updateProviderAt = (
    index: number,
    updater: (current: Record<string, unknown>) => Record<string, unknown>,
  ) => {
    updatePreparedConfig((next) => {
      const list = asProviders(next);
      const current = list[index] ?? {};
      list[index] = updater(current);
      next[MODEL_PROVIDERS_KEY] = list;
    });
  };

  const updateProviderById = (
    providerId: string,
    updater: (current: Record<string, unknown>) => Record<string, unknown>,
  ) => {
    const targetIndex = providers.findIndex(
      (provider) => asString(provider.id).trim() === providerId,
    );
    if (targetIndex < 0) {
      return;
    }
    updateProviderAt(targetIndex, updater);
  };

  const updateModelAt = (
    index: number,
    updater: (current: Record<string, unknown>) => Record<string, unknown>,
  ) => {
    updatePreparedConfig((next) => {
      const list = asArray(next.models);
      const current = list[index] ?? {};
      list[index] = updater(current);
      next.models = list;
    });
  };

  const updateOptionalNumberField = (index: number, key: string, raw: string) => {
    const parsed = parseNumberInput(raw);
    updateModelAt(index, (current) => {
      const nextModel = { ...current };
      if (parsed === undefined) {
        delete nextModel[key];
      } else {
        nextModel[key] = parsed;
      }
      return nextModel;
    });
  };

  const updateProviderProtocol = (index: number, protocol: ProviderProtocol) => {
    const preset = getPresetById(
      protocol === "anthropic-compatible"
        ? ANTHROPIC_PROVIDER_PRESET
        : OPENAI_PROVIDER_PRESET,
    );
    updateProviderAt(index, (current) => ({
      ...current,
      protocol,
      use: defaultUseByProtocol(protocol),
      preset_id: preset?.id ?? OPENAI_PROVIDER_PRESET,
      api_base:
        asString(current.api_base).trim() !== ""
          ? asString(current.api_base).trim()
          : (preset?.defaultApiBase ?? ""),
    }));
  };

  const removeProvider = (providerId: string) => {
    const fallbackProviderId = asString(
      providers.find((provider) => asString(provider.id).trim() !== providerId)?.id,
    ).trim();

    updatePreparedConfig((next) => {
      const currentProviders = asProviders(next).filter(
        (provider) => asString(provider.id).trim() !== providerId,
      );
      const fallbackProvider = currentProviders[0] ?? {};
      const fallbackProviderId = asString(fallbackProvider.id).trim();
      const fallbackProviderProtocol = fallbackProviderId
        ? getProviderProtocol(fallbackProvider)
        : undefined;
      const shouldClearProviderFields = currentProviders.length === 0;
      const currentModels = asArray(next.models).map((model) => {
        const modelProviderId = asString(model.provider_id).trim();
        if (!shouldClearProviderFields && modelProviderId !== providerId) {
          return model;
        }

        if (shouldClearProviderFields) {
          const nextModel: Record<string, unknown> = {
            ...model,
            provider_id: "",
            provider_protocol: "",
          };
          delete nextModel.use;
          delete nextModel.api_key;
          delete nextModel.api_base;
          return nextModel;
        }

        return {
          ...model,
          provider_id: fallbackProviderId,
          provider_protocol: fallbackProviderProtocol,
        };
      });
      next[MODEL_PROVIDERS_KEY] = currentProviders;
      next.models = currentModels;
    });

    setProviderFeedback((prev) => {
      const next = { ...prev };
      delete next[providerId];
      return next;
    });
    setProviderDetailView("details");
    setProviderModelDialogOpen(false);
    setProviderPanelView("list");
    setSelectedProviderId(fallbackProviderId);
  };

  const runProviderConnectionTest = async (
    input: {
      providerKey: string;
      providerId?: string;
      use: string;
      apiKey: string;
      apiBase: string;
      model?: string;
      protocol: ProviderProtocol;
    },
  ) => {
    setTestingProviderKey(input.providerKey);
    try {
      const result = await testModelConnection({
        use: input.use,
        model: input.model,
        api_key: input.apiKey,
        api_base: input.apiBase,
        provider_protocol: input.protocol,
      });

      const feedback: ProviderFeedback = {
        success: result.success,
        message: result.message,
        latencyMs: result.latency_ms ?? null,
        responsePreview: result.response_preview ?? null,
      };

      if (input.providerId) {
        setProviderFeedback((prev) => ({ ...prev, [input.providerId!]: feedback }));
        updateProviderById(input.providerId, (current) => ({
          ...current,
          last_test_status: result.success ? "success" : "failed",
          last_tested_at: new Date().toISOString(),
          last_test_message: result.message,
          last_test_signature: buildDraftProviderConnectionSignature({
            protocol: getProviderProtocol(current),
            apiBase: asString(current.api_base).trim(),
            apiKeyDisplay: getProviderApiKeyDisplay(current),
          }),
        }));
      } else {
        setCreateFeedback(feedback);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : copy.testFailed;
      const feedback: ProviderFeedback = {
        success: false,
        message,
      };
      if (input.providerId) {
        setProviderFeedback((prev) => ({ ...prev, [input.providerId!]: feedback }));
        updateProviderById(input.providerId, (current) => ({
          ...current,
          last_test_status: "failed",
          last_tested_at: new Date().toISOString(),
          last_test_message: message,
          last_test_signature: buildDraftProviderConnectionSignature({
            protocol: getProviderProtocol(current),
            apiBase: asString(current.api_base).trim(),
            apiKeyDisplay: getProviderApiKeyDisplay(current),
          }),
        }));
      } else {
        setCreateFeedback(feedback);
      }
    } finally {
      setTestingProviderKey((current) => (current === input.providerKey ? null : current));
    }
  };

  const handleFetchProviderModels = async (providerId: string) => {
    const providerIndex = providers.findIndex(
      (provider) => asString(provider.id).trim() === providerId,
    );
    if (providerIndex < 0) {
      return;
    }
    const provider = providers[providerIndex] ?? {};

    setLoadingCatalogProviderId(providerId);
    try {
      const result = await loadProviderModels({
        use: asString(provider.use).trim(),
        api_key: asString(provider.api_key).trim(),
        api_base: asString(provider.api_base).trim(),
        provider_protocol: getProviderProtocol(provider),
      });

      updateProviderAt(providerIndex, (current) => {
        return {
          ...current,
          catalog_models: result.models.map((model) => mapProviderModelOptionToConfig(model)),
          catalog_updated_at: new Date().toISOString(),
          catalog_provider_type: result.provider_type,
          catalog_message: result.message,
        };
      });

      setProviderFeedback((prev) => ({
        ...prev,
        [providerId]: {
          success: result.success,
          message: result.message,
        },
      }));

      setCatalogSelectedProviderId(providerId);
      setCatalogSelectedModelIds([]);
      setCatalogSearch("");
    } catch (err) {
      setProviderFeedback((prev) => ({
        ...prev,
        [providerId]: {
          success: false,
          message: err instanceof Error ? err.message : copy.testFailed,
        },
      }));
    } finally {
      setLoadingCatalogProviderId((current) => (
        current === providerId ? null : current
      ));
    }
  };

  const inspectModelMetadataWithProvider = async (
    provider: Record<string, unknown>,
    modelId: string,
    silent = false,
  ): Promise<ProviderModelOption | null> => {
    try {
      const result = await loadModelMetadata({
        model: modelId,
        use: asString(provider.use).trim(),
        api_base: asString(provider.api_base).trim(),
        provider_protocol: getProviderProtocol(provider),
      });

      if (!result.success || !result.found || !result.model) {
        if (!silent) {
          toast(result.message || copy.metadataNotFound);
        }
        return null;
      }

      return result.model;
    } catch (err) {
      if (!silent) {
        toast.error(err instanceof Error ? err.message : copy.metadataNotFound);
      }
      return null;
    }
  };

  const checkModelMetadataAt = async (index: number) => {
    const model = models[index] ?? {};
    const modelId = asString(model.model).trim();
    const providerId = asString(model.provider_id).trim();

    if (!providerId) {
      toast.error(copy.inspectRequiresProvider);
      return;
    }

    if (!modelId) {
      toast.error(copy.inspectRequiresModelId);
      return;
    }

    const provider = providerById.get(providerId);
    if (!provider) {
      toast.error(copy.inspectRequiresProvider);
      return;
    }

    const inspectKey = `${index}-${providerId}-${modelId}`;
    setInspectingModelKey(inspectKey);
    const metadata = await inspectModelMetadataWithProvider(provider, modelId, false);
    if (metadata) {
      updateModelAt(index, (current) => mergeModelMetadata(current, metadata));
      toast.success(copy.metadataFilled);
    }
    setInspectingModelKey((current) => (current === inspectKey ? null : current));
  };

  const toggleSelectedModelId = (modelId: string) => {
    const normalized = modelId.trim();
    if (!normalized) {
      return;
    }
    setCatalogSelectedModelIds((prev) => (
      prev.includes(normalized)
        ? prev.filter((id) => id !== normalized)
        : [...prev, normalized]
    ));
  };

  const addModelIdFromSearch = (providerId?: string) => {
    const typed = catalogSearch.trim();
    if (!typed) {
      return;
    }
    const effectiveProviderId = (providerId ?? activeCatalogProviderId).trim();
    const effectiveProvider = effectiveProviderId
      ? providerById.get(effectiveProviderId)
      : undefined;
    const catalogModels = effectiveProvider ? asCatalogModels(effectiveProvider) : [];
    const exactCatalogMatch = catalogModels.find(
      (item) => item.id.toLowerCase() === typed.toLowerCase(),
    );
    const resolvedId = exactCatalogMatch?.id ?? typed;

    setCatalogSelectedModelIds((prev) => {
      const exists = prev.some((id) => id.toLowerCase() === resolvedId.toLowerCase());
      if (exists) {
        return prev;
      }
      return [...prev, resolvedId];
    });
    setCatalogSearch("");
  };

  const addSelectedCatalogModels = async (
    targetProviderId?: string,
    onAdded?: () => void,
  ) => {
    const explicitProviderId = targetProviderId?.trim() ?? "";
    const providerId = explicitProviderId !== "" ? explicitProviderId : activeCatalogProviderId;
    if (!providerId || catalogSelectedModelIds.length === 0) {
      return;
    }

    const provider = providerById.get(providerId);
    if (!provider) {
      return;
    }

    const catalogModels = asCatalogModels(provider);
    const catalogById = new Map(catalogModels.map((item) => [item.id, item] as const));
    const selectedIds = [...new Set(catalogSelectedModelIds.map((id) => id.trim()).filter(Boolean))];
    if (selectedIds.length === 0) {
      return;
    }

    const selectedOptions: ProviderCatalogModel[] = selectedIds.map((id) => {
      const fromCatalog = catalogById.get(id);
      if (fromCatalog) {
        return fromCatalog;
      }
      return {
        id,
        name: id,
      };
    });

    const existingModelKeys = new Set(
      models.map((model) => `${asString(model.provider_id).trim()}::${asString(model.model).trim()}`),
    );
    const optionsToAdd = selectedOptions.filter(
      (item) => !existingModelKeys.has(`${providerId}::${item.id}`),
    );

    if (optionsToAdd.length === 0) {
      toast(copy.duplicateModelHint);
      return;
    }

    setAddingCatalogModels(true);
    try {
      const metadataEntries = await Promise.all(
        optionsToAdd.map(async (item) => {
          const metadata = await inspectModelMetadataWithProvider(provider, item.id, true);
          return [item.id, metadata] as const;
        }),
      );
      const metadataById = new Map(metadataEntries);

      updatePreparedConfig((next) => {
        const list = asArray(next.models);
        const usedNames = new Set(
          list
            .map((model) => asString(model.name).trim())
            .filter((name) => name.length > 0),
        );

        optionsToAdd.forEach((option, idx) => {
          const aliasBase = toSafeAlias(option.id, `model-${list.length + idx + 1}`);
          const internalName = ensureUniqueId(aliasBase, usedNames);
          const baseModel: Record<string, unknown> = {
            name: internalName,
            display_name: asString(option.name).trim() !== "" ? option.name : option.id,
            model: option.id,
            provider_id: providerId,
            provider_protocol: providerProtocolById.get(providerId) ?? "openai-compatible",
            supports_thinking:
              typeof option.supports_thinking === "boolean"
                ? option.supports_thinking
                : undefined,
            supports_vision:
              typeof option.supports_vision === "boolean"
                ? option.supports_vision
                : undefined,
            supports_video:
              typeof option.supports_video === "boolean"
                ? option.supports_video
                : undefined,
            max_tokens:
              typeof option.max_output_tokens === "number"
                ? option.max_output_tokens
                : undefined,
            context_window:
              typeof option.context_window === "number"
                ? option.context_window
                : undefined,
          };

          const metadata = metadataById.get(option.id);
          list.push(metadata ? mergeModelMetadata(baseModel, metadata) : baseModel);
        });

        next.models = list;
      });

      setCatalogSelectedModelIds([]);
      setCatalogSearch("");
      onAdded?.();
      toast.success(
        isZh
          ? `已添加 ${optionsToAdd.length} 个模型。`
          : `${optionsToAdd.length} model(s) added.`,
      );
    } finally {
      setAddingCatalogModels(false);
    }
  };

  const setDefaultModel = (index: number) => {
    if (index <= 0) {
      return;
    }
    updatePreparedConfig((next) => {
      const list = asArray(next.models);
      const [selected] = list.splice(index, 1);
      if (!selected) {
        return;
      }
      list.unshift(selected);
      next.models = list;
    });
  };

  const removeModel = (index: number) => {
    updatePreparedConfig((next) => {
      const list = asArray(next.models);
      list.splice(index, 1);
      next.models = list;
    });
  };

  const requestDeleteProvider = (providerId: string) => {
    const providerName = asString(
      providers.find((provider) => asString(provider.id).trim() === providerId)?.name,
    ).trim() || providerId;
    setPendingDeleteAction({
      kind: "provider",
      providerId,
      message: copy.confirmDeleteProvider.replace("{name}", providerName),
    });
  };

  const requestDeleteModel = (index: number, afterDelete?: () => void) => {
    const targetModel = models[index] ?? {};
    const modelName = asString(targetModel.display_name).trim()
      || asString(targetModel.model).trim()
      || asString(targetModel.name).trim()
      || (isZh ? `模型 #${index + 1}` : `Model #${index + 1}`);
    setPendingDeleteAction({
      kind: "model",
      index,
      message: copy.confirmDeleteModel.replace("{name}", modelName),
      afterDelete,
    });
  };

  const handleConfirmDelete = () => {
    if (!pendingDeleteAction) {
      return;
    }

    if (pendingDeleteAction.kind === "provider") {
      removeProvider(pendingDeleteAction.providerId);
      setPendingDeleteAction(null);
      return;
    }

    removeModel(pendingDeleteAction.index);
    pendingDeleteAction.afterDelete?.();
    setPendingDeleteAction(null);
  };

  const applyCatalogOptionToModel = (
    index: number,
    option: ProviderCatalogModel,
  ) => {
    updateModelAt(index, (current) => {
      const nextModel: Record<string, unknown> = {
        ...current,
        model: option.id,
        name: asString(current.name).trim()
          ? current.name
          : toSafeAlias(option.id, `model-${index + 1}`),
      };
      if (!asString(current.display_name).trim()) {
        nextModel.display_name =
          asString(option.name).trim() !== "" ? option.name : option.id;
      }
      if (typeof option.supports_thinking === "boolean" && isFieldBlank(current.supports_thinking)) {
        nextModel.supports_thinking = option.supports_thinking;
      }
      if (typeof option.supports_vision === "boolean" && isFieldBlank(current.supports_vision)) {
        nextModel.supports_vision = option.supports_vision;
      }
      if (typeof option.supports_video === "boolean" && isFieldBlank(current.supports_video)) {
        nextModel.supports_video = option.supports_video;
      }
      if (
        typeof option.max_output_tokens === "number"
        && parseNumberInput(asString(current.max_tokens)) === undefined
      ) {
        nextModel.max_tokens = option.max_output_tokens;
      }
      if (
        typeof option.context_window === "number"
        && parseNumberInput(asString(current.context_window)) === undefined
      ) {
        nextModel.context_window = option.context_window;
      }
      return nextModel;
    });
  };

  const getProviderConnectionStatus = (provider: Record<string, unknown>, providerId: string) => {
    const sessionFeedback = providerFeedback[providerId];
    if (sessionFeedback) {
      return {
        success: sessionFeedback.success,
        label: sessionFeedback.success ? copy.statusConnected : copy.statusFailed,
      };
    }

    const persistedSignature = asString(provider.last_test_signature).trim();
    const currentSignature = buildDraftProviderConnectionSignature({
      protocol: getProviderProtocol(provider),
      apiBase: asString(provider.api_base).trim(),
      apiKeyDisplay: getProviderApiKeyDisplay(provider),
    });
    const hasConnectionChanges = hasDraftProviderConnectionChanges({
      protocol: getProviderProtocol(provider),
      apiBase: asString(provider.api_base).trim(),
      apiKeyDisplay: getProviderApiKeyDisplay(provider),
      persistedSignature,
      apiKeyDirty: asBoolean(provider.api_key_dirty, false),
    });
    const raw = asString(provider.last_test_status).trim().toLowerCase();
    if (raw === "success" && !hasConnectionChanges && persistedSignature === currentSignature) {
      return { success: true, label: copy.statusConnected };
    }
    if (raw === "failed") {
      return { success: false, label: copy.statusFailed };
    }
    return { success: null, label: copy.statusUntested };
  };

  const renderProviderList = () => (
    <section className="space-y-4 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-1">
          <div className="text-sm font-semibold">{copy.providersTitle}</div>
          <div className="text-muted-foreground text-xs">{copy.providersSubtitle}</div>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setProviderPanelView("create");
            setCreateDraft(createProviderDraft("openai-compatible", providers.length + 1, isZh));
            setCreateFeedback(null);
          }}
          disabled={disabled}
        >
          <PlusIcon className="size-4" />
          {copy.createProvider}
        </Button>
      </div>

      {providers.length === 0 ? (
        <div className="text-muted-foreground rounded-md border border-dashed p-3 text-xs">
          {copy.noProvider}
        </div>
      ) : (
        <div
          className={cn(
            "grid gap-3 md:grid-cols-2",
            providers.length >= 3 && "xl:grid-cols-3",
          )}
        >
          {providers.map((provider) => {
            const providerId = asString(provider.id).trim();
            if (!providerId) {
              return null;
            }
            const providerName = asString(provider.name).trim() || providerId;
            const protocol = getProviderProtocol(provider);
            const isActive = providerPanelView === "edit" && selectedProviderId === providerId;
            const status = getProviderConnectionStatus(provider, providerId);
            const configuredCount = configuredModelCountByProviderId.get(providerId) ?? 0;

            return (
              <button
                key={providerId}
                type="button"
              onClick={() => {
                setProviderPanelView("edit");
                setSelectedProviderId(providerId);
              }}
                className={cn(
                  "group w-full rounded-xl border p-4 text-left transition-all duration-200 md:min-h-[176px]",
                  "bg-gradient-to-b from-background to-muted/20 hover:border-primary/40 hover:shadow-sm",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                  isActive && "border-primary/70 bg-primary/5 shadow-sm",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-base font-semibold leading-5">
                      {providerName}
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className="shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium"
                  >
                    {protocolLabel(protocol, isZh)}
                  </Badge>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  <div className="rounded-md border bg-background/80 px-3 py-2">
                    <div className="text-muted-foreground text-[11px] leading-4">
                      {copy.modelCount}
                    </div>
                    <div className="mt-1 text-sm font-semibold leading-5 text-foreground">
                      {configuredCount}
                    </div>
                  </div>
                  <div className="rounded-md border bg-background/80 px-3 py-2">
                    <div className="text-muted-foreground text-[11px] leading-4">
                      {copy.lastTestedAt}
                    </div>
                    <div className="mt-1 truncate text-sm font-medium leading-5 text-foreground">
                      {formatLastTestTime(asString(provider.last_tested_at), locale)}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                      status.success === true && "border-emerald-200 bg-emerald-50 text-emerald-700",
                      status.success === false && "border-rose-200 bg-rose-50 text-rose-700",
                      status.success === null && "border-muted-foreground/20 bg-muted/30 text-muted-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        status.success === true && "bg-emerald-600",
                        status.success === false && "bg-rose-600",
                        status.success === null && "bg-muted-foreground",
                      )}
                    />
                    {status.label}
                  </span>

                  <span className="text-muted-foreground group-hover:text-foreground inline-flex items-center gap-1 text-xs font-medium transition-colors">
                    {copy.openProvider}
                    <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );

  const renderCreateProviderDetail = () => {
    const createKey = "__create_provider__";
    const isTesting = testingProviderKey === createKey;
    return (
      <section className="space-y-4 rounded-xl border bg-card p-4">
        {providers.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            className="w-fit"
            onClick={() => {
              setProviderPanelView("list");
              setCreateFeedback(null);
            }}
            disabled={disabled}
          >
            <ArrowLeftIcon className="size-4" />
            {copy.backToProviderList}
          </Button>
        )}

        <div className="space-y-1">
          <div className="text-sm font-semibold">{copy.createDetailTitle}</div>
          <div className="text-muted-foreground text-xs">
            {isZh ? "只需填写关键字段即可接入。" : "Only a few fields are required to connect."}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <div className="text-xs font-medium">{copy.providerName}</div>
            <Input
              value={createDraft.name}
              placeholder={copy.providerNamePlaceholder}
              onChange={(e) => setCreateDraft((current) => ({ ...current, name: e.target.value }))}
              disabled={disabled}
            />
          </div>

          <div className="space-y-1.5">
            <div className="text-xs font-medium">{copy.providerProtocol}</div>
            <Select
              value={createDraft.protocol}
              onValueChange={(value) => {
                const protocol = value as ProviderProtocol;
                const preset = getPresetById(
                  protocol === "anthropic-compatible"
                    ? ANTHROPIC_PROVIDER_PRESET
                    : OPENAI_PROVIDER_PRESET,
                );
                setCreateDraft((current) => ({
                  ...current,
                  protocol,
                  use: preset?.use ?? defaultUseByProtocol(protocol),
                  api_base: preset?.defaultApiBase ?? "",
                }));
                setCreateFeedback(null);
              }}
            >
              <SelectTrigger disabled={disabled}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai-compatible">{copy.providerProtocolOpenAI}</SelectItem>
                <SelectItem value="anthropic-compatible">{copy.providerProtocolAnthropic}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <div className="text-xs font-medium">{copy.apiKey}</div>
            <div className="relative">
              <Input
                type={createApiKeyVisible ? "text" : "password"}
                value={createDraft.api_key}
                onChange={(e) => setCreateDraft((current) => ({ ...current, api_key: e.target.value }))}
                placeholder={
                  createDraft.protocol === "anthropic-compatible"
                    ? "$ANTHROPIC_API_KEY"
                    : "$OPENAI_API_KEY"
                }
                className="pr-10"
                disabled={disabled}
              />
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                className="absolute top-1/2 right-1 -translate-y-1/2"
                onClick={() => setCreateApiKeyVisible((current) => !current)}
                aria-label={createApiKeyVisible ? copy.hideApiKey : copy.showApiKey}
                title={createApiKeyVisible ? copy.hideApiKey : copy.showApiKey}
                disabled={disabled}
              >
                {createApiKeyVisible ? (
                  <EyeOffIcon className="size-4" />
                ) : (
                  <EyeIcon className="size-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="text-xs font-medium">{copy.apiBase}</div>
            <Input
              value={createDraft.api_base}
              onChange={(e) => setCreateDraft((current) => ({ ...current, api_base: e.target.value }))}
              placeholder={
                createDraft.protocol === "anthropic-compatible"
                  ? copy.apiBasePlaceholderAnthropic
                  : copy.apiBasePlaceholder
              }
              disabled={disabled}
            />
          </div>

        </div>

        {createFeedback && (
          <div
            className={cn(
              "rounded-md border px-3 py-2 text-xs",
              createFeedback.success
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-rose-200 bg-rose-50 text-rose-700",
            )}
          >
            <div className="flex items-center gap-1.5 font-medium">
              {createFeedback.success ? (
                <CircleCheckIcon className="size-3.5" />
              ) : (
                <CircleAlertIcon className="size-3.5" />
              )}
              {createFeedback.success ? copy.testSuccess : copy.testFailed}
              {typeof createFeedback.latencyMs === "number" && ` · ${createFeedback.latencyMs} ms`}
            </div>
            <div className="mt-1 break-all">{createFeedback.message}</div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              void runProviderConnectionTest({
                providerKey: createKey,
                use: createDraft.use,
                apiKey: createDraft.api_key,
                apiBase: createDraft.api_base,
                protocol: createDraft.protocol,
              });
            }}
            disabled={Boolean(disabled) || isTesting}
          >
            <PlugZapIcon className="size-4" />
            {isTesting ? copy.testingConnection : copy.testConnection}
          </Button>

          <Button
            size="sm"
            onClick={() => {
              const usedIds = new Set(
                providers
                  .map((provider) => asString(provider.id).trim())
                  .filter((id) => id.length > 0),
              );
              const baseId = toSafeAlias(
                createDraft.name.trim() || `provider-${providers.length + 1}`,
                `provider-${providers.length + 1}`,
              );
              const providerId = ensureUniqueId(baseId, usedIds);

              const preset = getPresetById(
                createDraft.protocol === "anthropic-compatible"
                  ? ANTHROPIC_PROVIDER_PRESET
                  : OPENAI_PROVIDER_PRESET,
              );

              updatePreparedConfig((next) => {
                const list = asProviders(next);
                list.push({
                  id: providerId,
                  name: createDraft.name.trim() || providerId,
                  preset_id: preset?.id ?? OPENAI_PROVIDER_PRESET,
                  protocol: createDraft.protocol,
                  use: createDraft.use.trim() || defaultUseByProtocol(createDraft.protocol),
                  api_key: createDraft.api_key.trim(),
                  api_key_masked: createDraft.api_key.trim(),
                  api_key_present: createDraft.api_key.trim() !== "",
                  api_key_dirty: true,
                  api_base: createDraft.api_base.trim(),
                  catalog_models: [],
                  catalog_updated_at: "",
                  catalog_provider_type: "",
                  catalog_message: "",
                  last_test_status: "",
                  last_test_signature: "",
                });
                next[MODEL_PROVIDERS_KEY] = list;
              });

              setProviderPanelView("edit");
              setSelectedProviderId(providerId);
              setCatalogSelectedProviderId(providerId);
              setCreateFeedback(null);
              setCreateDraft(createProviderDraft("openai-compatible", providers.length + 2, isZh));
            }}
            disabled={disabled}
          >
            {copy.saveProvider}
          </Button>
        </div>

      </section>
    );
  };

  const renderSelectedProviderModelsPanel = () => {
    if (!selectedProvider || selectedProviderIndex < 0) {
      return (
        <section className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
          {copy.noProvider}
        </section>
      );
    }

    const providerId = asString(selectedProvider.id).trim();
    const providerName = asString(selectedProvider.name).trim() || providerId;
    const protocol = getProviderProtocol(selectedProvider);
    const providerModelEntries = models
      .map((model, index) => ({ model, index }))
      .filter(({ model }) => asString(model.provider_id).trim() === providerId);
    const openAddProviderModelDialog = () => {
      setCatalogSelectedProviderId(providerId);
      setCatalogSelectedModelIds([]);
      setCatalogSearch("");
      setProviderModelDialogOpen(true);
      void handleFetchProviderModels(providerId);
    };

    const renderProviderModelsLayer = () => (
      <section className="space-y-3 rounded-lg border bg-muted/10 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-muted-foreground text-xs">{copy.providerModelsSubtitle}</div>
          <Button
            size="sm"
            onClick={openAddProviderModelDialog}
            disabled={disabled}
          >
            <PlusIcon className="size-4" />
            {copy.addProviderModel}
          </Button>
        </div>

        {providerModelEntries.length === 0 ? (
          <div className="text-muted-foreground rounded-md border border-dashed bg-background/70 p-3 text-xs">
            {copy.noProviderModels}
          </div>
        ) : (
          <div className="space-y-2">
            {providerModelEntries.map(({ model, index }) => {
              const displayName = asString(model.display_name).trim()
                || asString(model.model).trim()
                || (isZh ? `模型 #${index + 1}` : `Model #${index + 1}`);
              const modelId = asString(model.model).trim() || "-";
              const isDefaultModel = index === 0;
              return (
                <div
                  key={`${asString(model.name).trim() || modelId}-${index}`}
                  className="flex items-center justify-between gap-3 rounded-md border bg-background/70 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{displayName}</div>
                    <div className="text-muted-foreground truncate text-xs">{modelId}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isDefaultModel && (
                      <Badge
                        variant="secondary"
                        className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] text-amber-700"
                      >
                        {copy.default}
                      </Badge>
                    )}
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => {
                        requestDeleteModel(index);
                      }}
                      disabled={disabled}
                      aria-label={copy.remove}
                    >
                      <Trash2Icon className="size-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Dialog
          open={providerModelDialogOpen}
          onOpenChange={setProviderModelDialogOpen}
        >
          <DialogContent className="max-w-3xl gap-0 p-0">
            <DialogHeader className="border-b px-6 pt-6 pb-4">
              <DialogTitle>{copy.addProviderModelDialogTitle}</DialogTitle>
              <DialogDescription>{copy.addProviderModelDialogDesc}</DialogDescription>
            </DialogHeader>
            <div className="max-h-[72vh] overflow-y-auto p-6">
              {renderAddModelFlow({
                lockedProviderId: providerId,
                onAdded: () => {
                  setProviderModelDialogOpen(false);
                },
              })}
            </div>
          </DialogContent>
        </Dialog>
      </section>
    );

    return (
      <section className="space-y-4 rounded-xl border bg-card p-4">
        <Button
          size="sm"
          variant="ghost"
          className="w-fit"
          onClick={() => {
            setProviderDetailView("details");
            setModelViewContext("global");
            setProviderModelDialogOpen(false);
            onViewChange?.("providers");
          }}
          disabled={disabled}
        >
          <ArrowLeftIcon className="size-4" />
          {copy.backToProviderDetail}
        </Button>

        <div className="flex items-center justify-between gap-2">
          <div className="space-y-1">
            <div className="text-sm font-semibold">{copy.providerModelsTitle}</div>
            <div className="text-muted-foreground text-xs">{providerName}</div>
          </div>
          <Badge variant="outline">{protocolLabel(protocol, isZh)}</Badge>
        </div>

        {renderProviderModelsLayer()}
      </section>
    );
  };

  const renderEditProviderDetail = () => {
    if (!selectedProvider || selectedProviderIndex < 0) {
      return (
        <section className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
          {copy.noProvider}
        </section>
      );
    }

    if (providerDetailView === "models") {
      return renderSelectedProviderModelsPanel();
    }

    const protocol = getProviderProtocol(selectedProvider);
    const providerId = asString(selectedProvider.id).trim();
    const providerName = asString(selectedProvider.name).trim() || providerId;
    const feedback = providerFeedback[providerId];
    const isTesting = testingProviderKey === providerId;
    return (
      <section className="space-y-4 rounded-xl border bg-card p-4">
        <Button
          size="sm"
          variant="ghost"
          className="w-fit"
          onClick={() => {
            setProviderPanelView("list");
          }}
          disabled={disabled}
        >
          <ArrowLeftIcon className="size-4" />
          {copy.backToProviderList}
        </Button>

        <div className="flex items-center justify-between gap-2">
          <div className="space-y-1">
            <div className="text-sm font-semibold">{copy.providerDetailTitle}</div>
            <div className="text-muted-foreground text-xs">
              {providerName}
            </div>
          </div>
          <Badge variant="outline">{protocolLabel(protocol, isZh)}</Badge>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <div className="text-xs font-medium">{copy.providerName}</div>
            <Input
              value={asString(selectedProvider.name)}
              placeholder={copy.providerNamePlaceholder}
              onChange={(e) => updateProviderAt(selectedProviderIndex, (current) => ({
                ...current,
                name: e.target.value,
              }))}
              disabled={disabled}
            />
          </div>

          <div className="space-y-1.5">
            <div className="text-xs font-medium">{copy.providerProtocol}</div>
            <Select
              value={protocol}
              onValueChange={(value) => updateProviderProtocol(selectedProviderIndex, value as ProviderProtocol)}
            >
              <SelectTrigger disabled={disabled}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai-compatible">{copy.providerProtocolOpenAI}</SelectItem>
                <SelectItem value="anthropic-compatible">{copy.providerProtocolAnthropic}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <div className="text-xs font-medium">{copy.apiKey}</div>
            <div className="relative">
              <Input
                type={editApiKeyVisible ? "text" : "password"}
                value={getProviderApiKeyDisplay(selectedProvider)}
                onChange={(e) => updateProviderAt(selectedProviderIndex, (current) => ({
                  ...current,
                  api_key: e.target.value,
                  api_key_dirty: true,
                  api_key_present:
                    e.target.value.trim() !== "" || asBoolean(current.api_key_present, false),
                }))}
                placeholder={
                  protocol === "anthropic-compatible"
                    ? "$ANTHROPIC_API_KEY"
                    : "$OPENAI_API_KEY"
                }
                className="pr-10"
                disabled={disabled}
              />
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                className="absolute top-1/2 right-1 -translate-y-1/2"
                onClick={() => {
                  if (editApiKeyVisible) {
                    setEditApiKeyVisible(false);
                    return;
                  }
                  if (asString(selectedProvider.api_key).trim() !== "" || !asBoolean(selectedProvider.api_key_present, false)) {
                    setEditApiKeyVisible(true);
                    return;
                  }
                  setLoadingProviderSecretId(providerId);
                  void loadProviderSecretValue(providerId)
                    .then((secret) => {
                      updateProviderAt(selectedProviderIndex, (current) => ({
                        ...current,
                        api_key: secret.api_key,
                        api_key_length: secret.length,
                        api_key_present: true,
                      }));
                      setEditApiKeyVisible(true);
                    })
                    .finally(() => {
                      setLoadingProviderSecretId((current) => (current === providerId ? null : current));
                    });
                }}
                aria-label={editApiKeyVisible ? copy.hideApiKey : copy.showApiKey}
                title={editApiKeyVisible ? copy.hideApiKey : copy.showApiKey}
                disabled={disabled === true || loadingProviderSecretId === providerId}
              >
                {editApiKeyVisible ? (
                  <EyeOffIcon className="size-4" />
                ) : (
                  <EyeIcon className="size-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="text-xs font-medium">{copy.apiBase}</div>
            <Input
              value={asString(selectedProvider.api_base)}
              onChange={(e) => updateProviderAt(selectedProviderIndex, (current) => ({
                ...current,
                api_base: e.target.value,
              }))}
              placeholder={
                protocol === "anthropic-compatible"
                  ? copy.apiBasePlaceholderAnthropic
                  : copy.apiBasePlaceholder
              }
              disabled={disabled}
            />
          </div>
        </div>

        {feedback && (
          <div
            className={cn(
              "rounded-md border px-3 py-2 text-xs",
              feedback.success
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-rose-200 bg-rose-50 text-rose-700",
            )}
          >
            <div className="flex items-center gap-1.5 font-medium">
              {feedback.success ? (
                <CircleCheckIcon className="size-3.5" />
              ) : (
                <CircleAlertIcon className="size-3.5" />
              )}
              {feedback.success ? copy.testSuccess : copy.testFailed}
              {typeof feedback.latencyMs === "number" && ` · ${feedback.latencyMs} ms`}
            </div>
            <div className="mt-1 break-all">{feedback.message}</div>
            {feedback.responsePreview && (
              <div className="mt-1 line-clamp-2 text-[11px] opacity-90">
                {feedback.responsePreview}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              void runProviderConnectionTest({
                providerKey: providerId,
                providerId,
                use: asString(selectedProvider.use).trim(),
                apiKey: asString(selectedProvider.api_key).trim(),
                apiBase: asString(selectedProvider.api_base).trim(),
                protocol,
              });
            }}
            disabled={Boolean(disabled) || isTesting}
          >
            <PlugZapIcon className="size-4" />
            {isTesting ? copy.testingConnection : copy.testConnection}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setProviderDetailView("models");
              setModelViewContext("provider");
              setProviderModelDialogOpen(false);
              setCatalogSelectedProviderId(providerId);
              setCatalogSelectedModelIds([]);
              setCatalogSearch("");
              onViewChange?.("models");
            }}
            disabled={disabled}
          >
            {copy.openProviderModels}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="text-rose-600 hover:text-rose-600"
            onClick={() => requestDeleteProvider(providerId)}
            disabled={disabled}
          >
            <Trash2Icon className="size-4" />
            {copy.deleteProvider}
          </Button>
        </div>
      </section>
    );
  };

  const renderProviderSection = () => (
    <section className="space-y-4">
      {providerPanelView === "list" ? renderProviderList() : null}
      {providerPanelView === "create" ? renderCreateProviderDetail() : null}
      {providerPanelView === "edit" ? renderEditProviderDetail() : null}
    </section>
  );

  const renderAddModelFlow = (
    options?: {
      lockedProviderId?: string;
      onAdded?: () => void;
    },
  ) => {
    if (providerOptions.length === 0) {
      return (
        <div className="space-y-3 rounded-lg border border-dashed bg-muted/20 p-4">
          <div className="space-y-1">
            <div className="text-sm font-medium">{copy.noProviderCtaTitle}</div>
            <div className="text-muted-foreground text-xs">{copy.noProviderCtaHint}</div>
          </div>
          <div>
            <Button
              size="sm"
              onClick={() => {
                setProviderPanelView("create");
                onViewChange?.("providers");
              }}
              disabled={disabled}
            >
              <PlusIcon className="size-4" />
              {copy.goCreateProvider}
            </Button>
          </div>
        </div>
      );
    }

    const lockedProviderId = options?.lockedProviderId?.trim() ?? "";
    const isProviderLocked = lockedProviderId !== "";
    const targetProviderId = isProviderLocked ? lockedProviderId : activeCatalogProviderId;
    const activeProvider = providerById.get(targetProviderId);
    const targetCatalogModels = activeProvider ? asCatalogModels(activeProvider) : [];
    const filteredTargetCatalogModels = targetCatalogModels.filter((item) => {
      const q = catalogSearch.trim().toLowerCase();
      if (!q) {
        return true;
      }
      const composed = `${item.name ?? ""} ${item.id}`.toLowerCase();
      return composed.includes(q);
    });
    const hasActiveCatalogProvider = targetProviderId.trim() !== "";
    const hasCatalogForProvider = targetCatalogModels.length > 0;
    const activeProviderName = providerNameById.get(targetProviderId) ?? copy.unassigned;
    const typedModelId = catalogSearch.trim();
    const hasExactCatalogMatch = typedModelId !== ""
      && targetCatalogModels.some((item) => item.id.toLowerCase() === typedModelId.toLowerCase());
    const isTypedModelSelected = typedModelId !== ""
      && catalogSelectedModelIds.some((id) => id.toLowerCase() === typedModelId.toLowerCase());
    const showQuickAdd = hasActiveCatalogProvider && typedModelId !== "" && !hasExactCatalogMatch;
    const selectedManualModelIds = catalogSelectedModelIds.filter((selectedId) => (
      !targetCatalogModels.some((item) => item.id.toLowerCase() === selectedId.toLowerCase())
    ));

    return (
      <div className="space-y-4">
        {!isProviderLocked ? (
          <div className="space-y-1.5">
            <div className="text-sm font-medium">{copy.selectProvider}</div>
            <Select
              value={targetProviderId || UNASSIGNED_PROVIDER}
              onValueChange={(value) => {
                const nextProviderId = value === UNASSIGNED_PROVIDER ? "" : value;
                setCatalogSelectedProviderId(nextProviderId);
                setCatalogSelectedModelIds([]);
                setCatalogSearch("");
                if (nextProviderId) {
                  void handleFetchProviderModels(nextProviderId);
                }
              }}
            >
              <SelectTrigger disabled={Boolean(disabled) || providerOptions.length === 0}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED_PROVIDER}>{copy.unassigned}</SelectItem>
                {providerOptions.map((providerOption) => (
                  <SelectItem key={providerOption.id} value={providerOption.id}>
                    {providerOption.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge variant="outline" className="text-xs">
              {activeProviderName}
            </Badge>
            {loadingCatalogProviderId === targetProviderId ? (
              <span className="text-muted-foreground text-xs">{copy.fetchingCatalog}</span>
            ) : null}
          </div>
        )}

        {!hasActiveCatalogProvider ? (
          <div className="text-muted-foreground rounded-md border border-dashed bg-background/70 p-4 text-xs">
            {copy.selectProviderFirstHint}
          </div>
        ) : (
          <div className="space-y-3 rounded-lg border bg-background p-4">
            <div className="relative">
              <SearchIcon className="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
              <Input
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") {
                    return;
                  }
                  if (event.nativeEvent.isComposing) {
                    return;
                  }
                  event.preventDefault();
                  event.stopPropagation();
                  addModelIdFromSearch(targetProviderId);
                }}
                placeholder={copy.searchModel}
                className="pl-8"
                disabled={Boolean(disabled) || !targetProviderId}
              />
            </div>

            <div className="text-muted-foreground text-[11px]">
              {copy.enterToAddModel}
            </div>

            {!hasCatalogForProvider ? (
              <div className="text-muted-foreground rounded-md border border-dashed bg-muted/20 p-3 text-xs">
                {copy.noCatalog}
              </div>
            ) : null}

            <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border bg-background p-1.5">
              {selectedManualModelIds.map((modelId) => (
                <button
                  key={`manual-${modelId}`}
                  type="button"
                  className={cn(
                    "hover:bg-accent flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm",
                    "bg-accent/60",
                  )}
                  onClick={() => toggleSelectedModelId(modelId)}
                >
                  <div className="flex size-4 items-center justify-center rounded border">
                    <CheckIcon className="size-3" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{modelId}</div>
                    <div className="text-muted-foreground truncate text-[11px]">
                      {copy.manualAddedTag}
                    </div>
                  </div>
                </button>
              ))}

              {showQuickAdd && (
                <button
                  type="button"
                  className={cn(
                    "hover:bg-accent flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm",
                    isTypedModelSelected && "bg-accent",
                  )}
                  onClick={() => addModelIdFromSearch(targetProviderId)}
                  disabled={Boolean(disabled)}
                >
                  <div className="flex size-4 items-center justify-center rounded border">
                    <PlusIcon className="size-3" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate">
                      {copy.quickAddLabel}: {typedModelId}
                    </div>
                    <div className="text-muted-foreground truncate text-[11px]">
                      {typedModelId}
                    </div>
                  </div>
                </button>
              )}

              {filteredTargetCatalogModels.map((item) => {
                const selected = catalogSelectedModelIds.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={cn(
                      "hover:bg-accent flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm",
                      selected && "bg-accent",
                    )}
                    onClick={() => {
                      toggleSelectedModelId(item.id);
                    }}
                  >
                    <div className="flex size-4 items-center justify-center rounded border">
                      {selected ? <CheckIcon className="size-3" /> : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate">
                        {asString(item.name).trim() !== "" ? item.name : item.id}
                      </div>
                      <div className="text-muted-foreground truncate text-[11px]">
                        {item.id}
                      </div>
                    </div>
                  </button>
                );
              })}

              {!showQuickAdd
                && filteredTargetCatalogModels.length === 0
                && selectedManualModelIds.length === 0 ? (
                  <div className="text-muted-foreground px-2 py-3 text-xs">
                    {copy.selectedModelsEmpty}
                  </div>
                ) : null}
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="text-muted-foreground text-xs">
                {copy.selected}: {catalogSelectedModelIds.length}
              </div>
              <Button
                size="sm"
                onClick={() => {
                  void addSelectedCatalogModels(targetProviderId, options?.onAdded);
                }}
                disabled={Boolean(disabled) || catalogSelectedModelIds.length === 0 || addingCatalogModels}
              >
                <PlusIcon className="size-4" />
                {addingCatalogModels ? copy.adding : copy.addSelectedModels}
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderModelList = () => (
    <section className="space-y-4 rounded-xl border bg-card p-4">
      <div className="space-y-1">
        <div className="text-sm font-semibold">{copy.modelListTitle}</div>
        <div className="text-muted-foreground text-xs">{copy.modelListSubtitle}</div>
      </div>

      {models.length === 0 ? (
        <div className="text-muted-foreground rounded-md border border-dashed p-3 text-xs">
          {copy.noModelOnList}
        </div>
      ) : (
        <div className="space-y-2">
          {models.map((model, index) => {
            const displayName = asString(model.display_name).trim()
              || (isZh ? `模型 #${index + 1}` : `Model #${index + 1}`);
            const boundProvider = asString(model.provider_id).trim();
            const boundProtocol = boundProvider
              ? providerProtocolById.get(boundProvider)
              : undefined;
            const isLegacyImported = !boundProvider && asString(model.use).trim() !== "";
            const providerName = providerNameById.get(boundProvider)
              ?? (isLegacyImported ? copy.legacyImported : copy.unassigned);

            return (
              <div
                key={[
                  asString(model.provider_id).trim() || "unassigned",
                  asString(model.name).trim() || "model",
                  asString(model.model).trim() || "unknown",
                ].join("::")}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5",
                  "bg-background/70",
                )}
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="truncate text-sm font-semibold">{displayName}</div>
                  <div className="text-muted-foreground flex items-center gap-2 text-xs">
                    <span>{providerName}</span>
                    <span>·</span>
                    <span>{boundProtocol ? protocolLabel(boundProtocol, isZh) : copy.unassigned}</span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {index === 0 ? (
                    <Badge
                      variant="secondary"
                      className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] text-amber-700"
                    >
                      {copy.default}
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setDefaultModel(index);
                      }}
                      disabled={disabled}
                    >
                      {copy.setDefault}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                    onClick={() => {
                      requestDeleteModel(index);
                    }}
                    disabled={disabled}
                  >
                    <Trash2Icon className="size-4" />
                    {copy.remove}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );

  const renderCreateModelDetail = () => (
    <section className="space-y-4 rounded-xl border bg-card p-4">
      {models.length > 0 && (
        <Button
          size="sm"
          variant="ghost"
          className="w-fit"
          onClick={() => setModelPanelView("list")}
          disabled={disabled}
        >
          <ArrowLeftIcon className="size-4" />
          {copy.backToModelList}
        </Button>
      )}

      <div className="space-y-1">
        <div className="text-sm font-semibold">{copy.createModelTitle}</div>
      </div>

      {renderAddModelFlow()}
    </section>
  );

  const renderEditModelDetail = () => {
    if (models.length === 0) {
      return (
        <section className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
          {copy.noModelOnList}
        </section>
      );
    }

    const index = Math.min(selectedModelIndex, models.length - 1);
    const model = models[index] ?? {};
    const internalName = asString(model.name).trim();
    const boundProvider = asString(model.provider_id).trim();
    const boundProtocol = providerProtocolById.get(boundProvider);
    const boundCatalog = providerCatalogMap.get(boundProvider) ?? [];
    const hasCatalog = boundCatalog.length > 0;
    const modelIdSearchText = modelIdSearch[index]?.trim().toLowerCase() ?? "";
    const filteredBoundCatalog = boundCatalog.filter((item) => {
      if (!modelIdSearchText) {
        return true;
      }
      const composed = `${item.name ?? ""} ${item.id}`.toLowerCase();
      return composed.includes(modelIdSearchText);
    });

    const missingRequired = [
      asString(model.model).trim() ? null : copy.modelId,
      boundProvider ? null : copy.bindProvider,
    ].filter((item): item is string => Boolean(item));
    const duplicateName = internalName && (modelNameCount.get(internalName) ?? 0) > 1;
    const inspectKey = `${index}-${boundProvider}-${asString(model.model).trim()}`;
    const inspecting = inspectingModelKey === inspectKey;

    return (
      <section className="space-y-4 rounded-xl border bg-card p-4">
        <Button
          size="sm"
          variant="ghost"
          className="w-fit"
          onClick={() => setModelPanelView("list")}
          disabled={disabled}
        >
          <ArrowLeftIcon className="size-4" />
          {copy.backToModelList}
        </Button>

        <div className="flex items-center justify-between gap-2">
          <div className="space-y-1">
            <div className="text-sm font-semibold">{copy.editModelTitle}</div>
            <div className="text-muted-foreground text-xs">
              {asString(model.display_name).trim() || asString(model.model).trim() || internalName || "-"}
            </div>
          </div>
          {index === 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-700">
              <StarIcon className="size-3" />
              {copy.default}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">
            {copy.bindProvider}: {providerNameById.get(boundProvider) ?? copy.unassigned}
          </Badge>
          <Badge variant="outline">
            {copy.providerProtocol}: {boundProtocol ? protocolLabel(boundProtocol, isZh) : copy.unassigned}
          </Badge>
        </div>

        <div className="space-y-2 rounded-lg border bg-muted/10 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-medium">{isZh ? "快捷操作" : "Quick Actions"}</div>
            <div className="text-muted-foreground text-xs">
              {isZh ? "常用操作集中在这里，便于快速处理。" : "Common actions in one place."}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                void checkModelMetadataAt(index);
              }}
              disabled={Boolean(disabled) || inspecting}
            >
              <SparklesIcon className="size-4" />
              {inspecting ? copy.inspectingModel : copy.inspectModel}
            </Button>

            {index > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setDefaultModel(index);
                  setSelectedModelIndex(0);
                }}
                disabled={disabled}
              >
                <StarIcon className="size-4" />
                {copy.setDefault}
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              className="ml-auto border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              onClick={() => {
                requestDeleteModel(index, () => {
                  setSelectedModelIndex(0);
                  setModelPanelView(models.length - 1 > 0 ? "list" : "create");
                });
              }}
              disabled={disabled}
            >
              <Trash2Icon className="size-4" />
              {copy.remove}
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <div className="text-xs font-medium">{copy.modelName}</div>
            <Input
              value={asString(model.display_name)}
              placeholder={copy.modelNamePlaceholder}
              onChange={(e) =>
                updateModelAt(index, (current) => ({
                  ...current,
                  display_name: e.target.value,
                }))
              }
              disabled={disabled}
            />
          </div>
          <div className="space-y-1.5">
            <div className="text-xs font-medium">{copy.bindProvider}</div>
            <Select
              value={boundProvider || UNASSIGNED_PROVIDER}
              onValueChange={(value) => {
                const nextProviderId = value === UNASSIGNED_PROVIDER ? "" : value;
                updateModelAt(index, (current) => ({
                  ...current,
                  provider_id: nextProviderId,
                  provider_protocol: nextProviderId
                    ? (providerProtocolById.get(nextProviderId) ?? "openai-compatible")
                    : "",
                }));
              }}
            >
              <SelectTrigger
                disabled={Boolean(disabled) || providerOptions.length === 0}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED_PROVIDER}>{copy.unassigned}</SelectItem>
                {providerOptions.map((providerOption) => (
                  <SelectItem key={providerOption.id} value={providerOption.id}>
                    {providerOption.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium">{copy.modelId}</div>
            {hasCatalog && (
              <Button
                size="sm"
                variant="ghost"
                className="h-auto px-1 py-0 text-xs"
                onClick={() =>
                  setManualModelInputByIndex((prev) => ({
                    ...prev,
                    [index]: !prev[index],
                  }))
                }
                disabled={disabled}
              >
                {manualModelInputByIndex[index]
                  ? copy.catalogInput
                  : copy.manualInput}
              </Button>
            )}
          </div>

          {!manualModelInputByIndex[index] && hasCatalog ? (
            <Collapsible
              open={Boolean(modelIdPickerOpen[index])}
              onOpenChange={(open) =>
                setModelIdPickerOpen((prev) => ({
                  ...prev,
                  [index]: open,
                }))
              }
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  disabled={disabled}
                >
                  <span className="truncate">
                    {asString(model.model).trim() || copy.modelIdPlaceholder}
                  </span>
                  <ChevronsUpDownIcon className="text-muted-foreground size-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-2 rounded-md border bg-background p-2">
                <div className="relative">
                  <SearchIcon className="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
                  <Input
                    value={modelIdSearch[index] ?? ""}
                    onChange={(e) =>
                      setModelIdSearch((prev) => ({
                        ...prev,
                        [index]: e.target.value,
                      }))
                    }
                    placeholder={copy.searchModel}
                    className="pl-8"
                    disabled={disabled}
                  />
                </div>
                <div className="max-h-40 space-y-1 overflow-y-auto">
                  {filteredBoundCatalog.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={cn(
                        "hover:bg-accent flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm",
                        asString(model.model).trim() === item.id && "bg-accent",
                      )}
                      onClick={() => {
                        applyCatalogOptionToModel(index, item);
                        setModelIdPickerOpen((prev) => ({
                          ...prev,
                          [index]: false,
                        }));
                        setModelIdSearch((prev) => ({
                          ...prev,
                          [index]: "",
                        }));
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate">
                          {asString(item.name).trim() !== "" ? item.name : item.id}
                        </div>
                        <div className="text-muted-foreground truncate text-[11px]">
                          {item.id}
                        </div>
                      </div>
                      {asString(model.model).trim() === item.id && (
                        <CheckIcon className="size-4" />
                      )}
                    </button>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ) : (
            <Input
              value={asString(model.model)}
              placeholder={copy.modelIdPlaceholder}
              onChange={(e) => {
                const modelId = e.target.value;
                updateModelAt(index, (current) => ({
                  ...current,
                  model: modelId,
                  name: asString(current.name).trim()
                    ? current.name
                    : toSafeAlias(modelId, `model-${index + 1}`),
                }));
              }}
              disabled={disabled}
            />
          )}
        </div>

        <div className="grid gap-2 md:grid-cols-3">
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={asBoolean(model.supports_thinking)}
              onCheckedChange={(checked) =>
                updateModelAt(index, (current) => ({
                  ...current,
                  supports_thinking: checked,
                }))
              }
              disabled={disabled}
            />
            {copy.supportsThinking}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={asBoolean(model.supports_vision)}
              onCheckedChange={(checked) =>
                updateModelAt(index, (current) => ({
                  ...current,
                  supports_vision: checked,
                }))
              }
              disabled={disabled}
            />
            {copy.supportsVision}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={asBoolean(model.supports_video)}
              onCheckedChange={(checked) =>
                updateModelAt(index, (current) => ({
                  ...current,
                  supports_video: checked,
                }))
              }
              disabled={disabled}
            />
            {copy.supportsVideo}
          </label>
        </div>

        <Collapsible
          open={Boolean(modelAdvancedOpen[index])}
          onOpenChange={(open) =>
            setModelAdvancedOpen((prev) => ({
              ...prev,
              [index]: open,
            }))
          }
        >
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
            >
              <ChevronDownIcon
                className={cn(
                  "size-3.5 transition-transform",
                  modelAdvancedOpen[index] && "rotate-180",
                )}
              />
              {copy.advanced}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1.5">
                <div className="text-xs font-medium">{copy.internalName}</div>
                <Input
                  value={asString(model.name)}
                  placeholder={copy.internalNamePlaceholder}
                  onChange={(e) =>
                    updateModelAt(index, (current) => ({
                      ...current,
                      name: toSafeAlias(e.target.value, `model-${index + 1}`),
                    }))
                  }
                  disabled={disabled}
                />
              </div>
              <div className="space-y-1.5">
                <div className="text-xs font-medium">{copy.maxTokens}</div>
                <Input
                  type="number"
                  placeholder="4096"
                  value={asString(model.max_tokens)}
                  onChange={(e) =>
                    updateOptionalNumberField(index, "max_tokens", e.target.value)
                  }
                  disabled={disabled}
                />
              </div>
              <div className="space-y-1.5">
                <div className="text-xs font-medium">{copy.contextWindow}</div>
                <Input
                  type="number"
                  placeholder="128000"
                  value={asString(model.context_window)}
                  onChange={(e) =>
                    updateOptionalNumberField(index, "context_window", e.target.value)
                  }
                  disabled={disabled}
                />
              </div>
              <div className="space-y-1.5">
                <div className="text-xs font-medium">{copy.temperature}</div>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="0.7"
                  value={asString(model.temperature)}
                  onChange={(e) =>
                    updateOptionalNumberField(index, "temperature", e.target.value)
                  }
                  disabled={disabled}
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {missingRequired.length > 0 && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            {copy.modelMissingRequired}: {missingRequired.join(", ")}
          </div>
        )}

        {duplicateName && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            {copy.duplicateModelName}: <span className="font-mono">{internalName}</span>
          </div>
        )}
      </section>
    );
  };

  const renderModelSection = () => (
    <section className="space-y-4">
      {modelPanelView === "list" ? renderModelList() : null}
      {modelPanelView === "create" ? renderCreateModelDetail() : null}
      {modelPanelView === "edit" ? renderEditModelDetail() : null}
    </section>
  );

  const shouldRenderProviderModelContext =
    view === "models"
    && modelViewContext === "provider"
    && providerPanelView === "edit"
    && selectedProvider !== null;

  return (
    <div className="space-y-6">
      {view === "providers" ? renderProviderSection() : null}
      {view === "models"
        ? shouldRenderProviderModelContext
          ? renderSelectedProviderModelsPanel()
          : renderModelSection()
        : null}
      <ConfirmActionDialog
        open={pendingDeleteAction !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeleteAction(null);
          }
        }}
        title={copy.confirmDeleteTitle}
        description={pendingDeleteAction?.message ?? ""}
        cancelText={isZh ? "取消" : "Cancel"}
        confirmText={copy.confirmDeleteAction}
        onConfirm={handleConfirmDelete}
        confirmVariant="destructive"
      />
    </div>
  );
}
