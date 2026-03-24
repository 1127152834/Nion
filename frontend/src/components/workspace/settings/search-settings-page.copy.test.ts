import assert from "node:assert/strict";
import test from "node:test";

const { enUS } = await import(
  new URL("../../../core/i18n/locales/en-US.ts", import.meta.url).href,
);
const { zhCN } = await import(
  new URL("../../../core/i18n/locales/zh-CN.ts", import.meta.url).href,
);
const { buildSearchSettingsCopy } = await import(
  new URL("./search-settings-page.copy.ts", import.meta.url).href,
);

type SearchCapability = "web_search" | "web_fetch" | "image_search";

type ExpectedField = {
  id: string;
  type: "secret" | "number";
  label: string;
  placeholder: string;
  min?: number;
  max?: number;
  defaultValue?: number;
};

type ExpectedProvider = {
  id: string;
  title: string;
  description: string;
  use: string;
  docsUrl: string;
  fields: ExpectedField[];
};

const EXPECTED_EN_CATALOG: Record<SearchCapability, ExpectedProvider[]> = {
  web_search: [
    {
      id: "tavily",
      title: "Tavily",
      description: "Agent-oriented web search with configurable result count.",
      use: "nion.community.tavily.tools:web_search_tool",
      docsUrl: "https://tavily.com/",
      fields: [
        {
          id: "api_key",
          type: "secret",
          label: "API Key",
          placeholder: "Leave empty to use environment credentials if supported",
        },
        {
          id: "max_results",
          type: "number",
          label: "Max results",
          placeholder: "5",
          min: 1,
          max: 20,
          defaultValue: 5,
        },
      ],
    },
    {
      id: "firecrawl",
      title: "Firecrawl",
      description: "Use Firecrawl search as the runtime web search provider.",
      use: "nion.community.firecrawl.tools:web_search_tool",
      docsUrl: "https://www.firecrawl.dev/",
      fields: [
        {
          id: "api_key",
          type: "secret",
          label: "API Key",
          placeholder: "Leave empty to use environment credentials if supported",
        },
        {
          id: "max_results",
          type: "number",
          label: "Max results",
          placeholder: "5",
          min: 1,
          max: 20,
          defaultValue: 5,
        },
      ],
    },
  ],
  web_fetch: [
    {
      id: "jina_ai",
      title: "Jina Reader",
      description: "Read and simplify webpage contents through Jina Reader.",
      use: "nion.community.jina_ai.tools:web_fetch_tool",
      docsUrl: "https://jina.ai/reader/",
      fields: [
        {
          id: "timeout",
          type: "number",
          label: "Timeout (seconds)",
          placeholder: "10",
          min: 1,
          max: 60,
          defaultValue: 10,
        },
      ],
    },
    {
      id: "tavily",
      title: "Tavily Extract",
      description: "Fetch page content through Tavily extract.",
      use: "nion.community.tavily.tools:web_fetch_tool",
      docsUrl: "https://tavily.com/",
      fields: [
        {
          id: "api_key",
          type: "secret",
          label: "API Key",
          placeholder: "Leave empty to use environment credentials if supported",
        },
      ],
    },
    {
      id: "firecrawl",
      title: "Firecrawl Scrape",
      description: "Fetch page content through Firecrawl scrape.",
      use: "nion.community.firecrawl.tools:web_fetch_tool",
      docsUrl: "https://www.firecrawl.dev/",
      fields: [
        {
          id: "api_key",
          type: "secret",
          label: "API Key",
          placeholder: "Leave empty to use environment credentials if supported",
        },
      ],
    },
  ],
  image_search: [
    {
      id: "duckduckgo",
      title: "DuckDuckGo Images",
      description: "Reference image search through DuckDuckGo.",
      use: "nion.community.image_search.tools:image_search_tool",
      docsUrl: "https://duckduckgo.com/",
      fields: [
        {
          id: "max_results",
          type: "number",
          label: "Max results",
          placeholder: "5",
          min: 1,
          max: 20,
          defaultValue: 5,
        },
      ],
    },
  ],
};

function assertCatalogMatchesExpected(
  actualCatalog: Record<SearchCapability, ExpectedProvider[]>,
  expectedCatalog: Record<SearchCapability, ExpectedProvider[]>,
) {
  for (const capability of Object.keys(expectedCatalog) as SearchCapability[]) {
    const actualProviders = actualCatalog[capability];
    const expectedProviders = expectedCatalog[capability];

    assert.deepEqual(
      actualProviders.map((provider) => provider.id),
      expectedProviders.map((provider) => provider.id),
      `${capability} provider ids should remain ordered`,
    );

    actualProviders.forEach((provider, index) => {
      const expectedProvider = expectedProviders[index];
      assert.ok(
        expectedProvider,
        `missing expected provider metadata for ${capability} index ${index}`,
      );

      assert.equal(provider.id, expectedProvider.id);
      assert.equal(provider.title, expectedProvider.title);
      assert.equal(provider.description, expectedProvider.description);
      assert.equal(provider.use, expectedProvider.use);
      assert.equal(provider.docsUrl, expectedProvider.docsUrl);
      assert.ok(
        !("capability" in provider),
        `${capability}.${provider.id} should not expose a redundant capability field`,
      );

      assert.deepEqual(
        provider.fields.map((field) =>
          Object.fromEntries(
            Object.entries({
              id: field.id,
              type: field.type,
              label: field.label,
              placeholder: field.placeholder,
              min: field.min,
              max: field.max,
              defaultValue: field.defaultValue,
            }).filter(([, value]) => value !== undefined),
          ),
        ),
        expectedProvider.fields,
        `${capability}.${provider.id} field metadata should stay stable`,
      );
    });
  }
}

void test("buildSearchSettingsCopy preserves the full provider catalog contract", () => {
  const en = buildSearchSettingsCopy(enUS.settings.search);

  assertCatalogMatchesExpected(
    en.providerCatalog as Record<SearchCapability, ExpectedProvider[]>,
    EXPECTED_EN_CATALOG,
  );
});

void test("buildSearchSettingsCopy localizes capability, provider, and field metadata", () => {
  const en = buildSearchSettingsCopy(enUS.settings.search);
  const zh = buildSearchSettingsCopy(zhCN.settings.search);

  assert.equal(en.page.loadConfigFailed, "Failed to load search settings");
  assert.equal(en.capabilityMeta.web_search.title, "Web Search");
  assert.equal(zh.capabilityMeta.web_search.title, "网络搜索");
  assert.equal(
    zh.providerCatalog.web_search[0]?.description,
    "面向 Agent 的网络搜索，支持配置结果数量。",
  );
  assert.equal(zh.providerCatalog.web_fetch[0]?.title, "Jina Reader");
  assert.equal(
    zh.providerCatalog.web_fetch[0]?.use,
    "nion.community.jina_ai.tools:web_fetch_tool",
  );
  assert.equal(zh.providerCatalog.image_search[0]?.title, "DuckDuckGo 图片");
  assert.equal(zh.fieldMeta.max_results.label, "最大结果数");
  assert.equal(
    zh.fieldMeta.api_key.placeholder,
    "留空则在支持时使用环境变量中的凭证",
  );
});
