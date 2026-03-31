import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("self-maintenance page owns heartbeat and proposal surfaces", async () => {
  const source = await readFile(
    new URL("./self-maintenance-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /t\.workspaceSurfaces\.selfMaintenance\.title/);
  assert.match(source, /t\.workspaceSurfaces\.selfMaintenance\.heartbeatTitle/);
  assert.match(source, /t\.workspaceSurfaces\.selfMaintenance\.proposalsTitle/);
  assert.match(
    source,
    /t\.workspaceSurfaces\.selfMaintenance\.proposalsDescription/,
  );
  assert.doesNotMatch(
    source,
    />\s*(Self-Maintenance|Heartbeat|Memory Update Proposals)\s*</i,
  );
  assert.doesNotMatch(source, /Notebook|Knowledge Base|OpenViking Notebook Resources/);
});
