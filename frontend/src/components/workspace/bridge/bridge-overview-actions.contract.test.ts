import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("bridge overview panel exposes diagnostics and start-bridge actions", async () => {
  const source = await readFile(
    new URL("./BridgeOverviewPanel.tsx", import.meta.url),
    "utf8",
  );
  const layoutSource = await readFile(
    new URL("./BridgeLayout.tsx", import.meta.url),
    "utf8",
  );
  const sharedSource = await readFile(
    new URL("./bridge-shared.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /import \{ Button \} from "@\/components\/ui\/button";/);
  assert.match(source, /<Button/);
  assert.match(source, /t\("bridge\.overviewDiagnoseAction"\)/);
  assert.match(source, /t\("bridge\.overviewRestartAction"\)/);
  assert.match(source, /client\.diagnose\(\{ source: "bridge_page" \}\)/);
  assert.match(source, /client\.start\(\)/);
  assert.match(layoutSource, /activeBindings: snapshot\.activeBindings \?\? 0/);
  assert.match(layoutSource, /openIncidents: snapshot\.openIncidents \?\? 0/);
  assert.match(layoutSource, /enabledPlatforms: Array\.from\(\{ length: snapshot\.enabledPlatforms \?\? 0 \}, \(\) => ""\)/);
  assert.match(layoutSource, /autoStartEnabled: snapshot\.bridgeAutoStartEnabled === true/);
  assert.doesNotMatch(layoutSource, /getBridgeClient\(\)\?\.getRuntimeInfo\(\)/);
  assert.match(sharedSource, /"bridge\.overviewRestartAction": "Start bridge"/);
  assert.match(sharedSource, /"bridge\.overviewRestartAction": "启动 Bridge"/);
});
