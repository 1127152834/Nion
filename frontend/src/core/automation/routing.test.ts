import assert from "node:assert/strict";
import test from "node:test";

const { isAutomationPath } = await import(
  new URL("./routing.ts", import.meta.url).href
);

void test("marks automation workspace paths as active", () => {
  assert.equal(isAutomationPath("/workspace/automation"), true);
  assert.equal(isAutomationPath("/workspace/automation/history"), true);
  assert.equal(isAutomationPath("/workspace/chats"), false);
});
