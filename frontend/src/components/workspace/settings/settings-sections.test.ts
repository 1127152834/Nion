import assert from "node:assert/strict";
import test from "node:test";

import { SETTINGS_SECTIONS, parseSettingsSection } from "./settings-sections.ts";

void test("daemon appears as a first-class settings section", () => {
  assert.equal(SETTINGS_SECTIONS.includes("daemon"), true);
  assert.equal(parseSettingsSection("daemon"), "daemon");
});
