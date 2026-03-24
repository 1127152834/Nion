import type { Translations } from "../../../core/i18n/locales/types";

export type SearchCapability = "web_search" | "web_fetch" | "image_search";
export type SearchFieldType = "string" | "secret" | "number";
export type SearchFieldId = "api_key" | "max_results" | "timeout";

type SearchSettingsTranslations = Translations["settings"]["search"];

export type SearchSettingsPageCopy = Pick<
  SearchSettingsTranslations,
  | "title"
  | "description"
  | "loadConfigFailed"
  | "capabilityHint"
  | "unsupportedProviderPrefix"
  | "unsupportedProviderHint"
  | "providerTitle"
  | "providerPlaceholder"
  | "enableLabel"
  | "docsAction"
  | "supportedBadge"
  | "unsupportedBadge"
  | "noProviderFields"
>;

export type SearchProviderField = {
  id: SearchFieldId;
  type: SearchFieldType;
  label: string;
  help?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  defaultValue?: string | number;
};

export type SearchProviderCatalogItem = {
  id: string;
  title: string;
  description: string;
  use: string;
  docsUrl?: string;
  fields: SearchProviderField[];
};

export type SearchCapabilityMeta = Record<
  SearchCapability,
  {
    title: string;
    description: string;
  }
>;

export type SearchFieldMeta = Record<
  SearchFieldId,
  {
    label: string;
    placeholder: string;
  }
>;

export type SearchProviderCatalog = Record<
  SearchCapability,
  SearchProviderCatalogItem[]
>;

export type SearchSettingsCopy = {
  page: SearchSettingsPageCopy;
  capabilityMeta: SearchCapabilityMeta;
  fieldMeta: SearchFieldMeta;
  providerCatalog: SearchProviderCatalog;
};

function buildSearchField(
  id: SearchFieldId,
  type: SearchFieldType,
  meta: SearchFieldMeta[SearchFieldId],
  extra: Omit<SearchProviderField, "id" | "type" | "label" | "placeholder"> = {},
): SearchProviderField {
  return {
    id,
    type,
    label: meta.label,
    placeholder: meta.placeholder,
    ...extra,
  };
}

export function buildSearchSettingsCopy(
  search: SearchSettingsTranslations,
): SearchSettingsCopy {
  const fieldMeta: SearchFieldMeta = {
    api_key: {
      label: search.fields.apiKey.label,
      placeholder: search.fields.apiKey.placeholder,
    },
    max_results: {
      label: search.fields.maxResults.label,
      placeholder: search.fields.maxResults.placeholder,
    },
    timeout: {
      label: search.fields.timeout.label,
      placeholder: search.fields.timeout.placeholder,
    },
  };

  return {
    page: {
      title: search.title,
      description: search.description,
      loadConfigFailed: search.loadConfigFailed,
      capabilityHint: search.capabilityHint,
      unsupportedProviderPrefix: search.unsupportedProviderPrefix,
      unsupportedProviderHint: search.unsupportedProviderHint,
      providerTitle: search.providerTitle,
      providerPlaceholder: search.providerPlaceholder,
      enableLabel: search.enableLabel,
      docsAction: search.docsAction,
      supportedBadge: search.supportedBadge,
      unsupportedBadge: search.unsupportedBadge,
      noProviderFields: search.noProviderFields,
    },
    capabilityMeta: {
      web_search: {
        title: search.capabilities.web_search.title,
        description: search.capabilities.web_search.description,
      },
      web_fetch: {
        title: search.capabilities.web_fetch.title,
        description: search.capabilities.web_fetch.description,
      },
      image_search: {
        title: search.capabilities.image_search.title,
        description: search.capabilities.image_search.description,
      },
    },
    fieldMeta,
    providerCatalog: {
      web_search: [
        {
          id: "tavily",
          title: search.providers.tavily.webSearchTitle,
          description: search.providers.tavily.webSearchDescription,
          use: "nion.community.tavily.tools:web_search_tool",
          docsUrl: "https://tavily.com/",
          fields: [
            buildSearchField("api_key", "secret", fieldMeta.api_key),
            buildSearchField("max_results", "number", fieldMeta.max_results, {
              min: 1,
              max: 20,
              defaultValue: 5,
            }),
          ],
        },
        {
          id: "firecrawl",
          title: search.providers.firecrawl.webSearchTitle,
          description: search.providers.firecrawl.webSearchDescription,
          use: "nion.community.firecrawl.tools:web_search_tool",
          docsUrl: "https://www.firecrawl.dev/",
          fields: [
            buildSearchField("api_key", "secret", fieldMeta.api_key),
            buildSearchField("max_results", "number", fieldMeta.max_results, {
              min: 1,
              max: 20,
              defaultValue: 5,
            }),
          ],
        },
      ],
      web_fetch: [
        {
          id: "jina_ai",
          title: search.providers.jina_ai.webFetchTitle,
          description: search.providers.jina_ai.webFetchDescription,
          use: "nion.community.jina_ai.tools:web_fetch_tool",
          docsUrl: "https://jina.ai/reader/",
          fields: [
            buildSearchField("timeout", "number", fieldMeta.timeout, {
              min: 1,
              max: 60,
              defaultValue: 10,
            }),
          ],
        },
        {
          id: "tavily",
          title: search.providers.tavily.webFetchTitle,
          description: search.providers.tavily.webFetchDescription,
          use: "nion.community.tavily.tools:web_fetch_tool",
          docsUrl: "https://tavily.com/",
          fields: [buildSearchField("api_key", "secret", fieldMeta.api_key)],
        },
        {
          id: "firecrawl",
          title: search.providers.firecrawl.webFetchTitle,
          description: search.providers.firecrawl.webFetchDescription,
          use: "nion.community.firecrawl.tools:web_fetch_tool",
          docsUrl: "https://www.firecrawl.dev/",
          fields: [buildSearchField("api_key", "secret", fieldMeta.api_key)],
        },
      ],
      image_search: [
        {
          id: "duckduckgo",
          title: search.providers.duckduckgo.imageSearchTitle,
          description: search.providers.duckduckgo.imageSearchDescription,
          use: "nion.community.image_search.tools:image_search_tool",
          docsUrl: "https://duckduckgo.com/",
          fields: [
            buildSearchField("max_results", "number", fieldMeta.max_results, {
              min: 1,
              max: 20,
              defaultValue: 5,
            }),
          ],
        },
      ],
    },
  };
}
