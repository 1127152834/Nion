"use client";

import {
  ExternalLinkIcon,
  GlobeIcon,
  ImageIcon,
  SearchIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { useMemo } from "react";

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
import { useI18n } from "@/core/i18n/hooks";

import { ConfigValidationErrors } from "./config-validation-errors";
import { ConfigSaveBar } from "./configuration/config-save-bar";
import { asArray, asNumber, asString, cloneConfig, type ConfigDraft } from "./configuration/shared";
import { SettingsSection } from "./settings-section";
import { useConfigEditor } from "./use-config-editor";

type SearchCapability = "web_search" | "web_fetch" | "image_search";
type SearchFieldType = "string" | "secret" | "number";

type SearchProviderField = {
  id: string;
  type: SearchFieldType;
  label: string;
  help?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  defaultValue?: string | number;
};

type SearchProviderCatalogItem = {
  id: string;
  capability: SearchCapability;
  title: string;
  description: string;
  use: string;
  docsUrl?: string;
  fields: SearchProviderField[];
};

type SearchCapabilityState = {
  capability: SearchCapability;
  enabled: boolean;
  toolIndex: number;
  currentUse: string;
  provider: SearchProviderCatalogItem | null;
  tool: Record<string, unknown> | null;
};

const FALLBACK_COPY = {
  title: "Search",
  description:
    "Configure only the search and fetch providers that are actually wired into the current web runtime.",
  loadConfigFailed: "Failed to load search settings",
  capabilityHint:
    "The current runtime supports one provider per capability. Donor-style provider fallback chains are intentionally not exposed until the backend supports them.",
  unsupportedProviderPrefix:
    "This capability is currently backed by an unsupported provider for the web settings UI:",
  unsupportedProviderHint:
    "You can keep the current runtime value, or switch to one of the supported providers below.",
  selectProvider: "Provider",
  providerPlaceholder: "Select a provider",
  enableLabel: "Enabled",
  runtimeBound: "Runtime-bound",
  supportedBadge: "Supported",
  unsupportedBadge: "Unsupported",
  docsAction: "Docs",
  searchCapabilityTitle: "Web Search",
  fetchCapabilityTitle: "Web Fetch",
  imageCapabilityTitle: "Image Search",
  searchCapabilityDescription:
    "Search the web and return structured results that can be cited in chat.",
  fetchCapabilityDescription:
    "Fetch and simplify page contents from URLs already discovered by the runtime.",
  imageCapabilityDescription:
    "Search reference images for image generation and visual grounding tasks.",
  providerTitle: "Provider",
  fieldApiKey: "API Key",
  fieldMaxResults: "Max results",
  fieldTimeout: "Timeout (seconds)",
  fieldApiKeyPlaceholder: "Leave empty to use environment credentials if supported",
  fieldMaxResultsPlaceholder: "5",
  fieldTimeoutPlaceholder: "10",
  noProviderFields: "This provider has no extra config fields in the current runtime.",
} as const;

type SearchPageCopy = {
  [K in keyof typeof FALLBACK_COPY]: string;
};

const SEARCH_PROVIDER_CATALOG: SearchProviderCatalogItem[] = [
  {
    id: "tavily",
    capability: "web_search",
    title: "Tavily",
    description: "Agent-oriented web search with configurable result count.",
    use: "nion.community.tavily.tools:web_search_tool",
    docsUrl: "https://tavily.com/",
    fields: [
      {
        id: "api_key",
        type: "secret",
        label: FALLBACK_COPY.fieldApiKey,
        placeholder: FALLBACK_COPY.fieldApiKeyPlaceholder,
      },
      {
        id: "max_results",
        type: "number",
        label: FALLBACK_COPY.fieldMaxResults,
        min: 1,
        max: 20,
        defaultValue: 5,
        placeholder: FALLBACK_COPY.fieldMaxResultsPlaceholder,
      },
    ],
  },
  {
    id: "firecrawl",
    capability: "web_search",
    title: "Firecrawl",
    description: "Use Firecrawl search as the runtime web search provider.",
    use: "nion.community.firecrawl.tools:web_search_tool",
    docsUrl: "https://www.firecrawl.dev/",
    fields: [
      {
        id: "api_key",
        type: "secret",
        label: FALLBACK_COPY.fieldApiKey,
        placeholder: FALLBACK_COPY.fieldApiKeyPlaceholder,
      },
      {
        id: "max_results",
        type: "number",
        label: FALLBACK_COPY.fieldMaxResults,
        min: 1,
        max: 20,
        defaultValue: 5,
        placeholder: FALLBACK_COPY.fieldMaxResultsPlaceholder,
      },
    ],
  },
  {
    id: "jina_ai",
    capability: "web_fetch",
    title: "Jina Reader",
    description: "Read and simplify webpage contents through Jina Reader.",
    use: "nion.community.jina_ai.tools:web_fetch_tool",
    docsUrl: "https://jina.ai/reader/",
    fields: [
      {
        id: "timeout",
        type: "number",
        label: FALLBACK_COPY.fieldTimeout,
        min: 1,
        max: 60,
        defaultValue: 10,
        placeholder: FALLBACK_COPY.fieldTimeoutPlaceholder,
      },
    ],
  },
  {
    id: "tavily",
    capability: "web_fetch",
    title: "Tavily Extract",
    description: "Fetch page content through Tavily extract.",
    use: "nion.community.tavily.tools:web_fetch_tool",
    docsUrl: "https://tavily.com/",
    fields: [
      {
        id: "api_key",
        type: "secret",
        label: FALLBACK_COPY.fieldApiKey,
        placeholder: FALLBACK_COPY.fieldApiKeyPlaceholder,
      },
    ],
  },
  {
    id: "firecrawl",
    capability: "web_fetch",
    title: "Firecrawl Scrape",
    description: "Fetch page content through Firecrawl scrape.",
    use: "nion.community.firecrawl.tools:web_fetch_tool",
    docsUrl: "https://www.firecrawl.dev/",
    fields: [
      {
        id: "api_key",
        type: "secret",
        label: FALLBACK_COPY.fieldApiKey,
        placeholder: FALLBACK_COPY.fieldApiKeyPlaceholder,
      },
    ],
  },
  {
    id: "duckduckgo",
    capability: "image_search",
    title: "DuckDuckGo Images",
    description: "Reference image search through DuckDuckGo.",
    use: "nion.community.image_search.tools:image_search_tool",
    docsUrl: "https://duckduckgo.com/",
    fields: [
      {
        id: "max_results",
        type: "number",
        label: FALLBACK_COPY.fieldMaxResults,
        min: 1,
        max: 20,
        defaultValue: 5,
        placeholder: FALLBACK_COPY.fieldMaxResultsPlaceholder,
      },
    ],
  },
];

const CAPABILITY_META: Record<
  SearchCapability,
  {
    title: string;
    description: string;
    icon: typeof SearchIcon;
  }
> = {
  web_search: {
    title: FALLBACK_COPY.searchCapabilityTitle,
    description: FALLBACK_COPY.searchCapabilityDescription,
    icon: SearchIcon,
  },
  web_fetch: {
    title: FALLBACK_COPY.fetchCapabilityTitle,
    description: FALLBACK_COPY.fetchCapabilityDescription,
    icon: GlobeIcon,
  },
  image_search: {
    title: FALLBACK_COPY.imageCapabilityTitle,
    description: FALLBACK_COPY.imageCapabilityDescription,
    icon: ImageIcon,
  },
};

const CAPABILITY_ORDER: SearchCapability[] = [
  "web_search",
  "web_fetch",
  "image_search",
];

function catalogForCapability(
  capability: SearchCapability,
): SearchProviderCatalogItem[] {
  return SEARCH_PROVIDER_CATALOG.filter((item) => item.capability === capability);
}

function findToolIndex(
  tools: Record<string, unknown>[],
  capability: SearchCapability,
): number {
  return tools.findIndex((tool) => asString(tool.name).trim() === capability);
}

function findProviderByUse(
  capability: SearchCapability,
  usePath: string,
): SearchProviderCatalogItem | null {
  return (
    catalogForCapability(capability).find(
      (item) => item.use === usePath.trim(),
    ) ?? null
  );
}

function normalizeToolGroups(
  tools: Record<string, unknown>[],
): Record<string, unknown>[] {
  const seen = new Set<string>();
  const groups: Record<string, unknown>[] = [];
  for (const tool of tools) {
    const group = asString(tool.group).trim();
    if (!group || seen.has(group)) {
      continue;
    }
    seen.add(group);
    groups.push({ name: group });
  }
  return groups;
}

function buildCapabilityState(
  capability: SearchCapability,
  tools: Record<string, unknown>[],
): SearchCapabilityState {
  const index = findToolIndex(tools, capability);
  const tool = index >= 0 ? (tools[index] ?? null) : null;
  const currentUse = tool ? asString(tool.use).trim() : "";
  return {
    capability,
    enabled: tool !== null,
    toolIndex: index,
    currentUse,
    provider: currentUse ? findProviderByUse(capability, currentUse) : null,
    tool,
  };
}

function upsertCapabilityTool(
  config: ConfigDraft,
  capability: SearchCapability,
  provider: SearchProviderCatalogItem,
): ConfigDraft {
  const next = cloneConfig(config);
  const tools = asArray(next.tools);
  const toolIndex = findToolIndex(tools, capability);
  const current = toolIndex >= 0 ? { ...tools[toolIndex] } : null;

  const updated: Record<string, unknown> = {
    name: capability,
    group: "web",
    use: provider.use,
  };

  for (const field of provider.fields) {
    const currentValue = current?.[field.id];
    if (currentValue !== undefined && currentValue !== null && currentValue !== "") {
      updated[field.id] = currentValue;
    } else if (field.defaultValue !== undefined) {
      updated[field.id] = field.defaultValue;
    }
  }

  if (toolIndex >= 0) {
    tools[toolIndex] = updated;
  } else {
    tools.push(updated);
  }

  next.tools = tools;
  next.tool_groups = normalizeToolGroups(tools);
  return next;
}

function removeCapabilityTool(
  config: ConfigDraft,
  capability: SearchCapability,
): ConfigDraft {
  const next = cloneConfig(config);
  const tools = asArray(next.tools);
  const toolIndex = findToolIndex(tools, capability);
  if (toolIndex >= 0) {
    tools.splice(toolIndex, 1);
  }
  next.tools = tools;
  next.tool_groups = normalizeToolGroups(tools);
  return next;
}

function updateCapabilityField(
  config: ConfigDraft,
  capability: SearchCapability,
  field: SearchProviderField,
  rawValue: string,
): ConfigDraft {
  const next = cloneConfig(config);
  const tools = asArray(next.tools);
  const toolIndex = findToolIndex(tools, capability);
  if (toolIndex < 0) {
    return next;
  }

  const current = { ...tools[toolIndex] };
  if (field.type === "number") {
    const nextValue = rawValue.trim();
    if (!nextValue) {
      delete current[field.id];
    } else {
      current[field.id] = asNumber(nextValue, Number(field.defaultValue ?? 0));
    }
  } else if (!rawValue.trim()) {
    delete current[field.id];
  } else {
    current[field.id] = rawValue;
  }

  tools[toolIndex] = current;
  next.tools = tools;
  next.tool_groups = normalizeToolGroups(tools);
  return next;
}

function currentFieldValue(
  tool: Record<string, unknown> | null,
  field: SearchProviderField,
): string {
  if (!tool) {
    return "";
  }
  if (field.type === "number") {
    const raw = tool[field.id];
    if (raw === undefined || raw === null || raw === "") {
      return "";
    }
    if (typeof raw === "number" && Number.isFinite(raw)) {
      return String(raw);
    }
    if (typeof raw === "string") {
      return raw;
    }
    return "";
  }
  return asString(tool[field.id]);
}

function CapabilityCard({
  state,
  copy,
  config,
  disabled,
  onChange,
}: {
  state: SearchCapabilityState;
  copy: SearchPageCopy;
  config: ConfigDraft;
  disabled?: boolean;
  onChange: (next: ConfigDraft) => void;
}) {
  const meta = CAPABILITY_META[state.capability];
  const providers = catalogForCapability(state.capability);
  const Icon = meta.icon;

  return (
    <section className="space-y-4 rounded-xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Icon className="size-4" />
            {meta.title}
          </div>
          <div className="text-muted-foreground text-sm">{meta.description}</div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={state.provider ? "default" : "secondary"}>
            {state.provider ? copy.supportedBadge : copy.unsupportedBadge}
          </Badge>
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={state.enabled}
              disabled={disabled}
              onCheckedChange={(checked) => {
                if (!checked) {
                  onChange(removeCapabilityTool(config, state.capability));
                  return;
                }
                const provider = state.provider ?? providers[0];
                if (!provider) {
                  return;
                }
                onChange(upsertCapabilityTool(config, state.capability, provider));
              }}
            />
            {copy.enableLabel}
          </label>
        </div>
      </div>

      <div className="rounded-md border border-dashed bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
        {copy.capabilityHint}
      </div>

      {state.enabled && !state.provider && state.currentUse ? (
        <div className="rounded-md border border-amber-400/30 bg-amber-400/5 px-3 py-2 text-sm">
          <div className="flex items-start gap-2">
            <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <div className="space-y-1">
              <div>{copy.unsupportedProviderPrefix}</div>
              <div className="font-mono text-xs">{state.currentUse}</div>
              <div className="text-muted-foreground text-xs">
                {copy.unsupportedProviderHint}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {state.enabled ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2">
            <div className="text-xs font-medium">{copy.providerTitle}</div>
            <div className="flex gap-2">
              <Select
                value={state.provider?.id}
                onValueChange={(value) => {
                  const provider = providers.find((item) => item.id === value);
                  if (!provider) {
                    return;
                  }
                  onChange(upsertCapabilityTool(config, state.capability, provider));
                }}
                disabled={disabled}
              >
                <SelectTrigger className="max-w-sm">
                  <SelectValue placeholder={copy.providerPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      {provider.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {state.provider?.docsUrl ? (
                <Button asChild variant="outline" size="sm">
                  <a href={state.provider.docsUrl} target="_blank" rel="noreferrer">
                    {copy.docsAction}
                    <ExternalLinkIcon className="size-3.5" />
                  </a>
                </Button>
              ) : null}
            </div>
            {state.provider ? (
              <div className="text-muted-foreground text-xs">
                {state.provider.description}
              </div>
            ) : null}
          </div>

          {state.provider ? (
            state.provider.fields.length > 0 ? (
              state.provider.fields.map((field) => (
                <label key={`${state.capability}-${field.id}`} className="space-y-1.5">
                  <div className="text-xs font-medium">{field.label}</div>
                  <Input
                    type={field.type === "secret" ? "password" : field.type === "number" ? "number" : "text"}
                    min={field.type === "number" ? field.min : undefined}
                    max={field.type === "number" ? field.max : undefined}
                    inputMode={field.type === "number" ? "numeric" : undefined}
                    placeholder={field.placeholder}
                    value={currentFieldValue(state.tool, field)}
                    onChange={(event) =>
                      onChange(
                        updateCapabilityField(
                          config,
                          state.capability,
                          field,
                          event.target.value,
                        ),
                      )
                    }
                    disabled={disabled}
                  />
                  {field.help ? (
                    <div className="text-muted-foreground text-xs">{field.help}</div>
                  ) : null}
                </label>
              ))
            ) : (
              <div className="text-muted-foreground text-sm md:col-span-2">
                {copy.noProviderFields}
              </div>
            )
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export function SearchSettingsPage() {
  const { t } = useI18n();
  const {
    draftConfig,
    validationErrors,
    validationWarnings,
    isLoading,
    error,
    dirty,
    disabled,
    saving,
    onConfigChange,
    onDiscard,
    onSave,
  } = useConfigEditor();

  const copy: SearchPageCopy = useMemo(
    () => ({
      ...FALLBACK_COPY,
      title: t.settings.search?.title ?? FALLBACK_COPY.title,
      description: t.settings.search?.description ?? FALLBACK_COPY.description,
    }),
    [t.settings.search],
  );

  const tools = useMemo(() => asArray(draftConfig.tools), [draftConfig.tools]);
  const states = useMemo(
    () => CAPABILITY_ORDER.map((capability) => buildCapabilityState(capability, tools)),
    [tools],
  );

  return (
    <SettingsSection title={copy.title} description={copy.description}>
      {isLoading ? (
        <div className="text-muted-foreground text-sm">{t.common.loading}</div>
      ) : error ? (
        <div className="text-destructive text-sm">
          {error instanceof Error ? error.message : copy.loadConfigFailed}
        </div>
      ) : (
        <div className="space-y-4">
          {states.map((state) => (
            <CapabilityCard
              key={state.capability}
              state={state}
              copy={copy}
              config={draftConfig}
              disabled={disabled}
              onChange={onConfigChange}
            />
          ))}

          <ConfigValidationErrors
            errors={validationErrors}
            warnings={validationWarnings}
          />
          <ConfigSaveBar
            dirty={dirty}
            disabled={disabled}
            saving={saving}
            onDiscard={onDiscard}
            onSave={() => {
              void onSave();
            }}
          />
        </div>
      )}
    </SettingsSection>
  );
}
