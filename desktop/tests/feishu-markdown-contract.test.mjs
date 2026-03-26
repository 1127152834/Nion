import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("feishu markdown helpers distinguish complex markdown and html conversion", () => {
  const source = fs.readFileSync(
    new URL("../src/main/bridge/markdown/feishu.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /hasComplexFeishuMarkdown/);
  assert.match(source, /buildFeishuCardContent/);
  assert.match(source, /buildFeishuPostContent/);
  assert.match(source, /htmlToFeishuMarkdown/);
});
