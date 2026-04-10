import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("user identity panel exposes inline tuning instead of a bulk draft form", async () => {
  const source = await readFile(
    new URL("./user-identity-panel.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /用户姓名|称呼你|我的自称|沟通偏好/);
  assert.doesNotMatch(source, /草稿/);
  assert.doesNotMatch(source, /统一应用/);
});
