import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("soul settings page exposes stable settings instead of governance console metadata", async () => {
  const source = await readFile(
    new URL("./soul-settings-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /核心人格|说话方式|价值观|关系基调/);
  assert.match(source, /草稿|应用/);
  assert.match(source, /Settings\s*&gt;\s*Soul/);
  assert.doesNotMatch(source, /revision/i);
  assert.doesNotMatch(source, /evidence_ref/i);
  assert.doesNotMatch(source, /rollback/i);
  assert.doesNotMatch(source, /冻结自动演化/);
  assert.doesNotMatch(source, /Soul Console/);
  assert.doesNotMatch(source, /soul-console/);
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
