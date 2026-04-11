import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("soul settings page exposes stable settings instead of governance console metadata", async () => {
  const source = await readFile(
    new URL("./soul-settings-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /核心人格|说话方式|价值观|关系基调/);
  assert.match(source, /Settings\s*&gt;\s*Soul/);
  assert.doesNotMatch(source, /草稿应用/);
  assert.doesNotMatch(source, /当前没有未保存的改动/);
  assert.doesNotMatch(source, /revision/i);
  assert.doesNotMatch(source, /evidence_ref/i);
  assert.doesNotMatch(source, /rollback/i);
  assert.doesNotMatch(source, /冻结自动演化/);
  assert.doesNotMatch(source, /Soul Console/);
  assert.doesNotMatch(source, /soul-console/);
  assert.doesNotMatch(source, /这里只保留稳定层 Soul 设置/);
  assert.doesNotMatch(source, /正式入口位于 Settings/);
  assert.doesNotMatch(source, /稳定层只响应用户明确设置/);
  assert.doesNotMatch(source, /UserIdentityPanel|user-identity-panel/);
  assert.doesNotMatch(source, /has_active_overlay|adaptive_overlay_summary/);
  assert.doesNotMatch(source, /当前有临时微调|当前是稳定模式|没有额外临时微调|当前表达/);
});

void test("soul settings page stays outside the retired memory route namespace", async () => {
  const source = await readFile(
    new URL("./soul-settings-page.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /\/workspace\/memory\/soul|pathOfMemorySoul/);
  assert.doesNotMatch(
    source,
    /components\/workspace\/memory\/soul-console-page/,
  );
});
