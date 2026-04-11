import assert from "node:assert/strict";
import test from "node:test";

import { SETTINGS_SECTIONS, parseSettingsSection } from "./settings-sections.ts";

void test("daemon appears as a first-class settings section", () => {
  assert.equal(SETTINGS_SECTIONS.includes("daemon"), true);
  assert.equal(parseSettingsSection("daemon"), "daemon");
});

void test("agent integrations appears as a first-class settings section", () => {
  assert.equal(SETTINGS_SECTIONS.includes("agentIntegrations"), true);
  assert.equal(parseSettingsSection("agentIntegrations"), "agentIntegrations");
});

void test("identity appears as a first-class settings section", () => {
  assert.equal(SETTINGS_SECTIONS.includes("identity"), true);
  assert.equal(parseSettingsSection("identity"), "identity");
});
