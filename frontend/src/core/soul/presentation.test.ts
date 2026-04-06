import assert from "node:assert/strict";
import test from "node:test";

const { describeSoulSummary } = await import(
  new URL("./presentation.ts", import.meta.url).href
);

void test("describes soul summary with current soul, relation stance, and baseline text", () => {
  const summary = describeSoulSummary({
    currentSoul: {
      memory_id: "soul_overlay_active_main",
      domain: "soul",
      subtype: "adaptive_overlay",
      status: "active",
      summary: "最近减少鼓励式措辞。",
      title: "overlay",
    },
    coreSoul: {
      memory_id: "soul_core_main",
      domain: "soul",
      subtype: "core",
      status: "active",
      summary: "长期稳定、结论先行。",
      title: "core",
    },
  });

  assert.equal(summary.title, "当前的我");
  assert.match(summary.summary, /减少鼓励式措辞/);
  assert.match(summary.baselineLabel, /当前长期基线/);
  assert.match(summary.relationshipLabel, /当前关系姿态/);
});
