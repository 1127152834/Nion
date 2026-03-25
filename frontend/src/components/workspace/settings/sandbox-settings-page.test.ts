import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("sandbox settings page derives desktop shell capability and passes it to the sandbox section", async () => {
  const source = await readFile(
    new URL("./sandbox-settings-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /const isDesktopShell = useIsDesktopShell\(\);/);
  assert.match(source, /<SandboxSection[\s\S]*isDesktopShell=\{isDesktopShell\}/);
});

void test("sandbox section hides the aio provider behind a desktop shell gate", async () => {
  const source = await readFile(
    new URL("./configuration/sections/sandbox-section.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /const showDesktopAioWarning = isDesktopShell && currentProviderIsAio;/);
  assert.match(source, /!\s*isDesktopShell\s*\?\s*\(\s*<SelectItem value="aio">/s);
  assert.match(source, /desktopUnsupportedTitle/);
  assert.match(source, /desktopUnsupportedHint/);
});
