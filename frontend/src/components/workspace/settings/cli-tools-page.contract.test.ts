import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("settings CLI tools page owns the settings section shell", async () => {
  const source = await readFile(new URL("./cli-tools-page.tsx", import.meta.url), "utf8");

  assert.match(source, /SettingsSection/);
  assert.match(source, /CliToolsManager/);
  assert.match(source, /t\.settings\.cliTools\.title/);
  assert.match(source, /t\.settings\.cliTools\.description/);
});

void test("CLI tools manager stays reusable outside settings shell", async () => {
  const source = await readFile(
    new URL("../cli-tools/cli-tools-manager.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /<SettingsSection/);
});
