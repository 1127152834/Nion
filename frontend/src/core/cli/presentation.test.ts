import assert from "node:assert/strict";
import test from "node:test";

const { enUS } = await import(
  new URL("../i18n/locales/en-US.ts", import.meta.url).href,
);
const { zhCN } = await import(
  new URL("../i18n/locales/zh-CN.ts", import.meta.url).href,
);
const {
  buildCliToolsCopy,
  localizeCliApiError,
  resolveCliDescription,
} = await import(new URL("./presentation.ts", import.meta.url).href);

void test("resolveCliDescription localizes built-ins but preserves configured text", () => {
  assert.equal(
    resolveCliDescription(
      { id: "python3", configured: false, description: "Python runtime" },
      zhCN.settings.cliTools,
    ),
    "Python 运行时",
  );

  assert.equal(
    resolveCliDescription(
      { id: "ruff", configured: true, description: "Ruff formatter" },
      zhCN.settings.cliTools,
    ),
    "Ruff formatter",
  );

  assert.equal(
    resolveCliDescription(
      { id: "python3", configured: false, description: "Python 3.12 from pyenv" },
      zhCN.settings.cliTools,
    ),
    "Python 3.12 from pyenv",
  );

  assert.equal(
    resolveCliDescription(
      { id: "unknown", configured: false, description: "CLI tool" },
      zhCN.settings.cliTools,
    ),
    "CLI 工具",
  );
});

void test("buildCliToolsCopy exposes the localized page copy contract", () => {
  assert.deepEqual(buildCliToolsCopy(enUS.settings.cliTools), {
    title: "CLI Tools",
    description:
      "Manage the runtime-visible CLI catalog that powers the composer CLI lane.",
    runtimeHint:
      "This runtime currently exposes a detected CLI catalog only. Marketplace/install jobs are not shipped in this repository yet, so the settings page only manages lane visibility for the same catalog the composer uses.",
    empty: "No CLI tools detected in the current runtime.",
    enabled: "Enabled",
    disabled: "Disabled",
    installed: "Installed",
    missing: "Missing",
    configured: "Configured",
    hostDetected: "Host detected",
    pathLabel: "Path",
    sourceLabel: "Source",
    composerHint:
      "Disabling an item here removes it from the chat composer CLI shortcut lane because both surfaces read from /api/cli/catalog.",
    loadFailed: "Failed to load CLI catalog",
    saveFailed: "Failed to update CLI item",
  });
});

void test("localizeCliApiError translates stable CLI API error keys", () => {
  assert.equal(
    localizeCliApiError(
      new Error("settings.cliTools.errors.loadFailed::503"),
      enUS.settings.cliTools,
    ),
    "Failed to load CLI catalog (503)",
  );

  assert.equal(
    localizeCliApiError(
      new Error("settings.cliTools.errors.saveFailed::409"),
      zhCN.settings.cliTools,
    ),
    "更新 CLI 条目失败 (409)",
  );

  assert.equal(
    localizeCliApiError(new Error("Unexpected failure"), enUS.settings.cliTools),
    "Unexpected failure",
  );

  assert.equal(
    localizeCliApiError(
      new Error("settings.cliTools.errors.loadFailedExtra::503"),
      enUS.settings.cliTools,
    ),
    "settings.cliTools.errors.loadFailedExtra::503",
  );

  assert.equal(
    localizeCliApiError(
      new Error("settings.cliTools.errors.saveFailedOops"),
      zhCN.settings.cliTools,
    ),
    "settings.cliTools.errors.saveFailedOops",
  );
});
