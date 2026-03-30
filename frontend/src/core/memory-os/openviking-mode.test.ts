import assert from "node:assert/strict";
import test from "node:test";

import { describeOpenVikingMode } from "./openviking-mode.ts";

void test("describeOpenVikingMode formats embedded and remote labels", () => {
  assert.equal(describeOpenVikingMode({ mode: "embedded" }), "Embedded OpenViking");
  assert.equal(
    describeOpenVikingMode({
      mode: "remote",
      base_url: "https://memory.example.com",
    }),
    "Remote OpenViking",
  );
});
