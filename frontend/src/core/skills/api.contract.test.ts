import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("enableSkill checks response.ok before returning JSON", async () => {
  const source = await readFile(new URL("./api.ts", import.meta.url), "utf8");

  assert.match(source, /if \(!response\.ok\)/);
  assert.match(source, /throw new Error\(errorMessage\)/);
});

void test("skill settings page reports toggle failures with toast error", async () => {
  const source = await readFile(
    new URL("../../components/workspace/settings/skill-settings-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /onError:/);
  assert.match(source, /toast\.error\(/);
});
