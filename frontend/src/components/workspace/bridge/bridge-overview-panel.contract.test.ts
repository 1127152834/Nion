import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("bridge overview panel summarizes runtime state, bindings, incidents, and enabled platforms", async () => {
  const source = await readFile(
    new URL("./BridgeOverviewPanel.tsx", import.meta.url),
    "utf8",
  );
  const sharedSource = await readFile(
    new URL("./bridge-shared.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /export function BridgeOverviewPanel/);
  assert.match(source, /runtimeInfo: BridgeRuntimeInfo \| null/);
  assert.match(source, /runtimeInfo\?\.running \? t\("bridge\.overviewRunning"\) : t\("bridge\.overviewStopped"\)/);
  assert.match(source, /label: t\("bridge\.overviewRuntimeStatus"\)/);
  assert.match(source, /label: t\("bridge\.overviewActiveBindings"\)/);
  assert.match(source, /label: t\("bridge\.overviewOpenIncidents"\)/);
  assert.match(source, /label: t\("bridge\.overviewEnabledPlatforms"\)/);
  assert.match(source, /value: runtimeInfo\?\.activeBindings \?\? 0/);
  assert.match(source, /value: runtimeInfo\?\.openIncidents \?\? 0/);
  assert.match(source, /value: runtimeInfo\?\.enabledPlatforms\??\.length \?\? 0/);

  assert.match(sharedSource, /"bridge\.overviewTitle": "Bridge overview"/);
  assert.match(sharedSource, /"bridge\.overviewRuntimeStatus": "Runtime status"/);
  assert.match(sharedSource, /"bridge\.overviewActiveBindings": "Active bindings"/);
  assert.match(sharedSource, /"bridge\.overviewOpenIncidents": "Open incidents"/);
  assert.match(sharedSource, /"bridge\.overviewEnabledPlatforms": "Enabled platforms"/);
  assert.match(sharedSource, /"bridge\.overviewRunning": "Running"/);
  assert.match(sharedSource, /"bridge\.overviewStopped": "Stopped"/);
  assert.match(sharedSource, /"bridge\.overviewTitle": "Bridge 概览"/);
  assert.match(sharedSource, /"bridge\.overviewRuntimeStatus": "运行状态"/);
  assert.match(sharedSource, /"bridge\.overviewActiveBindings": "活跃绑定"/);
  assert.match(sharedSource, /"bridge\.overviewOpenIncidents": "待处理事件"/);
  assert.match(sharedSource, /"bridge\.overviewEnabledPlatforms": "已启用渠道"/);
  assert.match(sharedSource, /"bridge\.overviewRunning": "运行中"/);
  assert.match(sharedSource, /"bridge\.overviewStopped": "已停止"/);
});

void test("bridge layout renders the overview panel before platform tabs", async () => {
  const source = await readFile(new URL("./BridgeLayout.tsx", import.meta.url), "utf8");

  assert.match(source, /import \{ BridgeOverviewPanel \} from "\.\/BridgeOverviewPanel";/);
  assert.match(source, /const \[runtimeInfo, setRuntimeInfo\] = useState<BridgeRuntimeInfo \| null>\(null\);/);
  assert.match(source, /getBridgeClient\(\)\?\.getRuntimeInfo\(\)/);
  assert.match(source, /<BridgeOverviewPanel runtimeInfo=\{runtimeInfo\} \/>/);

  const overviewIndex = source.indexOf("<BridgeOverviewPanel runtimeInfo={runtimeInfo} />");
  const tabsIndex = source.indexOf('<div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-border/60 bg-background">');

  assert.notEqual(overviewIndex, -1);
  assert.notEqual(tabsIndex, -1);
  assert.ok(overviewIndex < tabsIndex);
});
