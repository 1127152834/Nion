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

const EXPECTED_BRIDGE_SHAPE = {
  menuLabel: true,
  desktopOnly: true,
  nav: {
    overview: true,
    telegram: true,
    feishu: true,
    discord: true,
    qq: true,
    weixin: true,
  },
  overview: {
    title: true,
    description: true,
    enableTitle: true,
    enableDescription: true,
    autoStartTitle: true,
    autoStartDescription: true,
    statusTitle: true,
    statusDescription: true,
    runtimeLabel: true,
    running: true,
    stopped: true,
    enabledPlatformsLabel: true,
    activePlatformsLabel: true,
    currentBindingsTitle: true,
    currentBindingsDescription: true,
    noBindings: true,
    platformLabel: true,
    chatLabel: true,
    threadLabel: true,
    workingDirectoryLabel: true,
    defaultWorkspaceTitle: true,
    defaultWorkspaceDescription: true,
    workingDirectoryTitle: true,
    defaultModelTitle: true,
    defaultProviderTitle: true,
    channelsTitle: true,
    channelsDescription: true,
    saveDefaultsAction: true,
    startAction: true,
    stopAction: true,
  },
  telegram: {
    title: true,
    description: true,
    saveAction: true,
    testAction: true,
    botTokenPlaceholder: true,
    chatIdPlaceholder: true,
    allowedUsersPlaceholder: true,
  },
  feishu: {
    title: true,
    description: true,
    saveAction: true,
    testAction: true,
    appIdPlaceholder: true,
    appSecretPlaceholder: true,
    allowFromPlaceholder: true,
    groupAllowFromPlaceholder: true,
    domainFeishu: true,
    domainLark: true,
    dmPolicyOpen: true,
    dmPolicyPairing: true,
    dmPolicyAllowlist: true,
    dmPolicyDisabled: true,
    groupPolicyOpen: true,
    groupPolicyAllowlist: true,
    groupPolicyDisabled: true,
    threadSession: true,
    requireMention: true,
  },
  discord: {
    title: true,
    description: true,
    saveAction: true,
    testAction: true,
    botTokenPlaceholder: true,
    allowedUsersPlaceholder: true,
    allowedChannelsPlaceholder: true,
    allowedGuildsPlaceholder: true,
    groupPolicyOpen: true,
    groupPolicyDisabled: true,
    requireMention: true,
    streamPreview: true,
    maxAttachmentPlaceholder: true,
    imageHandling: true,
  },
  qq: {
    title: true,
    description: true,
    saveAction: true,
    testAction: true,
    appIdPlaceholder: true,
    appSecretPlaceholder: true,
    allowedUsersPlaceholder: true,
    imageHandling: true,
    maxImageSizePlaceholder: true,
  },
  weixin: {
    title: true,
    description: true,
    accounts: true,
    accountsDesc: true,
    addAccount: true,
    qrLogin: true,
    qrWaiting: true,
    qrScanned: true,
    qrConfirmed: true,
    qrExpired: true,
    qrFailed: true,
    currentBindings: true,
    noAccounts: true,
    accountActive: true,
    accountPaused: true,
    accountExpired: true,
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

void test("bridge locale modules expose the full bridge i18n contract", () => {
  assert.deepEqual(shapeOf(enUS.bridge), EXPECTED_BRIDGE_SHAPE);
  assert.deepEqual(shapeOf(zhCN.bridge), EXPECTED_BRIDGE_SHAPE);
});
