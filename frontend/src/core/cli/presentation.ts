import type { Translations } from "../i18n/locales";

type CliToolsTranslations = Translations["settings"]["cliTools"];

type CliDescriptionInput = {
  id: string;
  configured: boolean;
  description: string;
};

const BUILTIN_DESCRIPTION_KEYS = {
  python3: "Python runtime",
  node: "Node.js runtime",
  git: "Git version control",
  pnpm: "pnpm package manager",
  uv: "uv Python package manager",
} as const satisfies Record<string, string>;

const ERROR_PREFIXES = {
  loadFailed: "settings.cliTools.errors.loadFailed",
  saveFailed: "settings.cliTools.errors.saveFailed",
} as const;

export function resolveCliDescription(
  item: CliDescriptionInput,
  copy: CliToolsTranslations,
) {
  if (item.configured) {
    return item.description;
  }

  const builtInDescription =
    BUILTIN_DESCRIPTION_KEYS[item.id as keyof typeof BUILTIN_DESCRIPTION_KEYS];
  if (builtInDescription && item.description === builtInDescription) {
    return copy.defaults[item.id as keyof typeof copy.defaults];
  }

  if (item.description === copy.defaults.generic || item.description === "CLI tool") {
    return copy.defaults.generic;
  }

  return item.description;
}

export function buildCliToolsCopy(copy: CliToolsTranslations) {
  return {
    title: copy.title,
    description: copy.description,
    runtimeHint: copy.runtime.hint,
    empty: copy.empty,
    enabled: copy.states.enabled,
    disabled: copy.states.disabled,
    installed: copy.states.installed,
    missing: copy.states.missing,
    configured: copy.states.configured,
    hostDetected: copy.sources.hostDetected,
    pathLabel: copy.labels.path,
    sourceLabel: copy.labels.source,
    composerHint: copy.hints.composer,
    loadFailed: copy.errors.loadFailed,
    saveFailed: copy.errors.saveFailed,
  };
}

export function localizeCliApiError(
  error: unknown,
  copy: CliToolsTranslations,
) {
  if (!(error instanceof Error)) {
    return "";
  }

  const message = error.message.trim();
  if (!message) {
    return "";
  }

  const localized = localizeErrorMessage(message, copy);
  return localized ?? message;
}

function localizeErrorMessage(message: string, copy: CliToolsTranslations) {
  const loadFailed = matchErrorKey(message, ERROR_PREFIXES.loadFailed);
  if (loadFailed) {
    return loadFailed.status
      ? `${copy.errors.loadFailed} (${loadFailed.status})`
      : copy.errors.loadFailed;
  }

  const saveFailed = matchErrorKey(message, ERROR_PREFIXES.saveFailed);
  if (saveFailed) {
    return saveFailed.status
      ? `${copy.errors.saveFailed} (${saveFailed.status})`
      : copy.errors.saveFailed;
  }

  return null;
}

function matchErrorKey(message: string, key: string) {
  if (message === key) {
    return { status: null };
  }

  const prefix = `${key}::`;
  if (!message.startsWith(prefix)) {
    return null;
  }

  const status = message.slice(prefix.length);
  return status ? { status } : null;
}
