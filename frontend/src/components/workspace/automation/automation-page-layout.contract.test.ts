import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("automation page uses a hero workspace shell with creator and overview rail", async () => {
  const source = await readFile(
    new URL("./automation-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /copy\.hero/);
  assert.match(source, /AutomationOverviewCards/);
  assert.match(source, /AutomationCreator/);
  assert.match(source, /copy\.hero\.quickActions/);
});
