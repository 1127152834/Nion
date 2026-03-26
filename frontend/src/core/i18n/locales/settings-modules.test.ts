import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as nodeModule from "node:module";
import test from "node:test";

const { stripTypeScriptTypes } = nodeModule as typeof nodeModule & {
  stripTypeScriptTypes: (code: string) => string;
};

const ICON_STUBS = `
const CompassIcon = Symbol("CompassIcon");
const GraduationCapIcon = Symbol("GraduationCapIcon");
const ImageIcon = Symbol("ImageIcon");
const MicroscopeIcon = Symbol("MicroscopeIcon");
const PenLineIcon = Symbol("PenLineIcon");
const ShapesIcon = Symbol("ShapesIcon");
const SparklesIcon = Symbol("SparklesIcon");
const VideoIcon = Symbol("VideoIcon");
`;

async function loadLocale<T>(filename: string, exportName: string): Promise<T> {
  const source = await readFile(new URL(filename, import.meta.url), "utf8");
  const strippedSource = stripTypeScriptTypes(
    source
      .replace(/import\s*\{[\s\S]*?\}\s*from "lucide-react";\n\n/, "")
      .replace(/import type \{ Translations \} from "\.\/types";\n\n/, "")
      .replace(
        new RegExp(`export const ${exportName}\\s*:\\s*Translations\\s*=`),
        "const __locale__ = ",
      ),
  );
  const executable = `${strippedSource}\nreturn __locale__;`;

  return new Function(`${ICON_STUBS}\n${executable}`)() as T;
}

const enUS = await loadLocale<typeof import("./en-US.ts").enUS>("./en-US.ts", "enUS");
const zhCN = await loadLocale<typeof import("./zh-CN.ts").zhCN>("./zh-CN.ts", "zhCN");

const EXPECTED_SEARCH_SHAPE = {
  title: true,
  description: true,
  loadConfigFailed: true,
  capabilityHint: true,
  unsupportedProviderPrefix: true,
  unsupportedProviderHint: true,
  providerTitle: true,
  providerPlaceholder: true,
  enableLabel: true,
  docsAction: true,
  supportedBadge: true,
  unsupportedBadge: true,
  noProviderFields: true,
  capabilities: {
    web_search: {
      title: true,
      description: true,
    },
    web_fetch: {
      title: true,
      description: true,
    },
    image_search: {
      title: true,
      description: true,
    },
  },
  fields: {
    apiKey: {
      label: true,
      placeholder: true,
    },
    maxResults: {
      label: true,
      placeholder: true,
    },
    timeout: {
      label: true,
      placeholder: true,
    },
  },
  providers: {
    tavily: {
      label: true,
      webSearchTitle: true,
      webSearchDescription: true,
      webFetchTitle: true,
      webFetchDescription: true,
    },
    firecrawl: {
      label: true,
      webSearchTitle: true,
      webSearchDescription: true,
      webFetchTitle: true,
      webFetchDescription: true,
    },
    jina_ai: {
      label: true,
      webFetchTitle: true,
      webFetchDescription: true,
    },
    duckduckgo: {
      label: true,
      imageSearchTitle: true,
      imageSearchDescription: true,
    },
  },
} as const;

const EXPECTED_CLI_TOOLS_SHAPE = {
  title: true,
  description: true,
  runtime: {
    hint: true,
  },
  empty: true,
  states: {
    enabled: true,
    disabled: true,
    installed: true,
    missing: true,
    configured: true,
  },
  sources: {
    hostDetected: true,
  },
  labels: {
    path: true,
    source: true,
  },
  hints: {
    composer: true,
  },
  defaults: {
    python3: true,
    node: true,
    git: true,
    pnpm: true,
    uv: true,
    generic: true,
  },
  errors: {
    loadFailed: true,
    saveFailed: true,
  },
} as const;

const EXPECTED_DAEMON_SHAPE = {
  title: true,
  description: true,
  allowBackgroundRunningLabel: true,
  allowBackgroundRunningHint: true,
} as const;

function shapeOf(value: unknown): true | Record<string, true | Record<string, unknown>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return true;
  }

  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nestedValue]) => [key, shapeOf(nestedValue)]),
  );
}

function assertSectionShape(
  label: string,
  value: unknown,
  expected: true | Record<string, true | Record<string, unknown>>,
): void {
  assert.deepEqual(shapeOf(value), expected, `${label} shape mismatch`);
}

void test("search, cliTools, and daemon expose the full settings i18n contract", () => {
  assertSectionShape("enUS.settings.search", enUS.settings.search, EXPECTED_SEARCH_SHAPE);
  assertSectionShape("zhCN.settings.search", zhCN.settings.search, EXPECTED_SEARCH_SHAPE);
  assertSectionShape(
    "enUS.settings.cliTools",
    enUS.settings.cliTools,
    EXPECTED_CLI_TOOLS_SHAPE,
  );
  assertSectionShape(
    "zhCN.settings.cliTools",
    zhCN.settings.cliTools,
    EXPECTED_CLI_TOOLS_SHAPE,
  );
  assertSectionShape(
    "enUS.settings.daemon",
    enUS.settings.daemon,
    EXPECTED_DAEMON_SHAPE,
  );
  assertSectionShape(
    "zhCN.settings.daemon",
    zhCN.settings.daemon,
    EXPECTED_DAEMON_SHAPE,
  );
});
