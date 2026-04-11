import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("user identity panel exposes inline tuning instead of a bulk draft form", async () => {
  const source = await readFile(
    new URL("./user-identity-panel.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /用户姓名|常用别名|称呼你|我的自称|沟通偏好|用户角色|时区|互动边界|长期背景/,
  );
  assert.doesNotMatch(source, /草稿/);
  assert.doesNotMatch(source, /统一应用/);
  assert.doesNotMatch(source, /改完就生效，新对话会直接沿用/);
  assert.doesNotMatch(source, /useEffect\(\(\) => \{\s*setDrafts\(/);
  assert.match(source, /dirty|fieldState|savedValue|updateField/i);
});
