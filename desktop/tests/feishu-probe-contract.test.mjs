import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("feishu adapter exposes a probe method", () => {
  const source = fs.readFileSync(
    new URL("../src/main/bridge/adapters/feishu-adapter.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /async probe\(\)/);
});

test("frontend feishu bridge section exposes a test connection action", () => {
  const source = fs.readFileSync(
    new URL("../..//frontend/src/components/workspace/bridge/FeishuBridgeSection.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /t\.bridge\.feishu\.testAction/);
});
