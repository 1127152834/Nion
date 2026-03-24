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

const EXPECTED_CHANNELS_SHAPE = {
  title: true,
  description: true,
  workspace: {
    title: true,
    description: true,
  },
  platforms: {
    lark: true,
    dingtalk: true,
    telegram: true,
  },
  configuration: {
    title: true,
    description: true,
  },
  labels: {
    enabled: true,
    disabled: true,
    accessMode: true,
    required: true,
    optional: true,
    loading: true,
    requestedAt: true,
    grantedAt: true,
    unknownTime: true,
  },
  modes: {
    webhook: true,
    stream: true,
  },
  proxyModes: {
    auto: true,
    direct: true,
    system: true,
  },
  fields: {
    appId: true,
    appSecret: true,
    verificationToken: true,
    encryptKey: true,
    clientId: true,
    clientSecret: true,
    robotCode: true,
    proxyMode: true,
    webhookUrl: true,
    signingSecret: true,
    botToken: true,
    allowedUsers: true,
    secretToken: true,
  },
  hints: {
    pairingGuide: true,
    larkVerificationToken: true,
    larkEncryptKey: true,
    dingtalkRobotCode: true,
    dingtalkProxyMode: true,
    dingtalkWebhookUrl: true,
  },
  actions: {
    setupDocs: true,
    testConnection: true,
    saveAndApply: true,
    goToPairing: true,
    refresh: true,
    approve: true,
    reject: true,
    revoke: true,
    cancel: true,
  },
  runtime: {
    statusTitle: true,
    statusDescription: true,
    activeUsersLabel: true,
    runningLabel: true,
    stoppedLabel: true,
    connectedLabel: true,
    disconnectedLabel: true,
    connectionFailedLabel: true,
    noStatus: true,
  },
  pairing: {
    sectionTitle: true,
    sectionDescription: true,
    code: {
      title: true,
      description: true,
      expireMinutes: true,
      generateAction: true,
      activeCode: true,
      noCodeGenerated: true,
      copiedToast: true,
      generatedToast: true,
      generateFailed: true,
      expiresAtPrefix: true,
      slotHint: true,
    },
    pending: {
      title: true,
      empty: true,
      approvedToast: true,
      rejectedToast: true,
    },
  },
  authorization: {
    title: true,
    empty: true,
    sessionOverrideBadge: true,
    sessionOverrideAction: true,
    revokeConfirmTemplate: true,
    revokedToast: true,
  },
  session: {
    defaultsTitle: true,
    defaultsDescription: true,
    assistantIdLabel: true,
    assistantIdPlaceholder: true,
    recursionLimitLabel: true,
    recursionLimitPlaceholder: true,
    thinkingLabel: true,
    planModeLabel: true,
    subagentLabel: true,
    inheritOption: true,
    enabledOption: true,
    disabledOption: true,
    inheritLabel: true,
    overrideDialogTitle: true,
    overrideDialogDescription: true,
    overrideCurrentLabel: true,
    resetAction: true,
    savedToast: true,
  },
  conversationTypes: {
    conversation: true,
    group: true,
    direct: true,
  },
  errors: {
    fillRequiredFieldsFirst: true,
    fillConnectionFieldsFirst: true,
    saveConfigFailed: true,
    connectionTestFailed: true,
    platformConfigSaved: true,
    platformConnectionSuccess: true,
    missingRequiredFieldsPrefix: true,
    approveFailed: true,
    rejectFailed: true,
    revokeFailed: true,
    sessionOverrideSaveFailed: true,
  },
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

void test("search, cliTools, and channels expose the full settings i18n contract", () => {
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
    "enUS.settings.channels",
    enUS.settings.channels,
    EXPECTED_CHANNELS_SHAPE,
  );
  assertSectionShape(
    "zhCN.settings.channels",
    zhCN.settings.channels,
    EXPECTED_CHANNELS_SHAPE,
  );
});
