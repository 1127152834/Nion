import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("bridge overview panel exposes diagnostics and restart actions", async () => {
  const source = await readFile(
    new URL("./BridgeOverviewPanel.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /client\.diagnose\(\{ source: "bridge_page" \}\)/);
  assert.match(source, /client\.start\(\)/);
});
