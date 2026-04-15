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
  assert.match(source, /let runtimeStatusLabel = t\("bridge\.overviewUnavailable"\)/);
  assert.match(source, /if \(runtimeInfo\) \{/);
  assert.match(source, /runtimeStatusLabel = runtimeInfo\.running \? t\("bridge\.overviewRunning"\) : t\("bridge\.overviewStopped"\)/);
  assert.match(source, /label: t\("bridge\.overviewRuntimeStatus"\)/);
  assert.match(source, /value: runtimeStatusLabel/);
  assert.match(source, /label: t\("bridge\.overviewActiveBindings"\)/);
  assert.match(source, /label: t\("bridge\.overviewOpenIncidents"\)/);
  assert.match(source, /label: t\("bridge\.overviewEnabledPlatforms"\)/);
  assert.match(source, /value: runtimeInfo\?\.activeBindings \?\? 0/);
  assert.match(source, /value: runtimeInfo\?\.openIncidents \?\? 0/);
  assert.match(source, /value: runtimeInfo\?\.enabledPlatforms\??\.length \?\? 0/);
  assert.match(source, /let riskHint = t\("bridge\.overviewHintUnavailable"\)/);
  assert.match(source, /if \(!runtimeInfo\)/);
  assert.match(source, /riskHint = t\("bridge\.overviewHintUnavailable"\)/);
  assert.match(source, /else if \(runtimeInfo\.openIncidents > 0\)/);
  assert.match(source, /riskHint = t\("bridge\.overviewHintIncidents"\)/);
  assert.match(source, /else if \(!runtimeInfo\.running && runtimeInfo\.autoStartEnabled\)/);
  assert.match(source, /riskHint = t\("bridge\.overviewHintAutoStartStopped"\)/);
  assert.match(source, /else if \(runtimeInfo\.enabledPlatforms\.length === 0\)/);
  assert.match(source, /riskHint = t\("bridge\.overviewHintNoPlatforms"\)/);
  assert.match(source, /riskHint = t\("bridge\.overviewHintReady"\)/);
  assert.match(source, /t\("bridge\.overviewPendingRiskHint"\)/);
  assert.match(source, /import \{ Button \} from "@\/components\/ui\/button";/);
  assert.match(source, /getBridgeClient\(\)/);
  assert.match(source, /t\("bridge\.overviewDiagnoseAction"\)/);
  assert.match(source, /t\("bridge\.overviewRestartAction"\)/);
  assert.doesNotMatch(source, /runtimeInfo\?\.running \? t\("bridge\.overviewRunning"\) : t\("bridge\.overviewStopped"\)/);

  assert.match(sharedSource, /"bridge\.overviewTitle": "Bridge overview"/);
  assert.match(sharedSource, /"bridge\.overviewRuntimeStatus": "Runtime status"/);
  assert.match(sharedSource, /"bridge\.overviewActiveBindings": "Active bindings"/);
  assert.match(sharedSource, /"bridge\.overviewOpenIncidents": "Open incidents"/);
  assert.match(sharedSource, /"bridge\.overviewEnabledPlatforms": "Enabled platforms"/);
  assert.match(sharedSource, /"bridge\.overviewUnavailable": "Unavailable"/);
  assert.match(sharedSource, /"bridge\.overviewRunning": "Running"/);
  assert.match(sharedSource, /"bridge\.overviewStopped": "Stopped"/);
  assert.match(sharedSource, /"bridge\.overviewPendingRiskHint": "Pending risk hint"/);
  assert.match(sharedSource, /"bridge\.overviewHintUnavailable": "Runtime status is unavailable until the desktop bridge responds\."/);
  assert.match(sharedSource, /"bridge\.overviewHintIncidents": "Open bridge incidents need review before this entry surface is considered stable\."/);
  assert.match(sharedSource, /"bridge\.overviewHintAutoStartStopped": "Auto-start is enabled, but the bridge is currently stopped and may need attention after launch\."/);
  assert.match(sharedSource, /"bridge\.overviewHintNoPlatforms": "No platforms are enabled yet, so this remote entry surface is not reachable\."/);
  assert.match(sharedSource, /"bridge\.overviewHintReady": "No pending bridge risk is visible from the current runtime overview\."/);
  assert.match(sharedSource, /"bridge\.overviewDiagnoseAction": "Run diagnostics"/);
  assert.match(sharedSource, /"bridge\.overviewRestartAction": "Restart bridge"/);
  assert.match(sharedSource, /"bridge\.overviewTitle": "Bridge 概览"/);
  assert.match(sharedSource, /"bridge\.overviewRuntimeStatus": "运行状态"/);
  assert.match(sharedSource, /"bridge\.overviewActiveBindings": "活跃绑定"/);
  assert.match(sharedSource, /"bridge\.overviewOpenIncidents": "待处理事件"/);
  assert.match(sharedSource, /"bridge\.overviewEnabledPlatforms": "已启用渠道"/);
  assert.match(sharedSource, /"bridge\.overviewUnavailable": "不可用"/);
  assert.match(sharedSource, /"bridge\.overviewRunning": "运行中"/);
  assert.match(sharedSource, /"bridge\.overviewStopped": "已停止"/);
  assert.match(sharedSource, /"bridge\.overviewPendingRiskHint": "待处理风险提示"/);
  assert.match(sharedSource, /"bridge\.overviewHintUnavailable": "桌面端 Bridge 尚未返回运行信息，当前概览风险状态未知。"/);
  assert.match(sharedSource, /"bridge\.overviewHintIncidents": "当前存在待处理 Bridge 事件，进入具体渠道前应先关注这些风险。"/);
  assert.match(sharedSource, /"bridge\.overviewHintAutoStartStopped": "已开启自动启动，但 Bridge 当前未运行，启动后可能需要进一步检查。"/);
  assert.match(sharedSource, /"bridge\.overviewHintNoPlatforms": "当前没有启用任何渠道，这个远程入口仍不可达。"/);
  assert.match(sharedSource, /"bridge\.overviewHintReady": "按当前运行概览看，没有待处理的 Bridge 风险提示。"/);
  assert.match(sharedSource, /"bridge\.overviewDiagnoseAction": "运行诊断"/);
  assert.match(sharedSource, /"bridge\.overviewRestartAction": "重启 Bridge"/);
});

void test("bridge layout renders the overview panel before platform tabs", async () => {
  const source = await readFile(new URL("./BridgeLayout.tsx", import.meta.url), "utf8");

  assert.match(source, /import \{ BridgeOverviewPanel \} from "\.\/BridgeOverviewPanel";/);
  assert.match(source, /const \[runtimeInfo, setRuntimeInfo\] = useState<BridgeRuntimeInfo \| null>\(null\);/);
  assert.match(source, /getBridgeClient\(\)\?\.getRuntimeInfo\(\)/);
  assert.match(source, /<BridgeOverviewPanel runtimeInfo=\{runtimeInfo\} \/>/);
  assert.match(source, /window\.addEventListener\("focus", handleWindowFocus\)/);
  assert.match(source, /document\.addEventListener\("visibilitychange", handleVisibilityChange\)/);
  assert.match(source, /if \(document\.visibilityState === "visible"\)/);

  const overviewIndex = source.indexOf("<BridgeOverviewPanel runtimeInfo={runtimeInfo} />");
  const tabsIndex = source.indexOf('<div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-border/60 bg-background">');

  assert.notEqual(overviewIndex, -1);
  assert.notEqual(tabsIndex, -1);
  assert.ok(overviewIndex < tabsIndex);
});
