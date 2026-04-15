import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import * as nodeModule from "node:module";

const { stripTypeScriptTypes } = nodeModule;

async function loadModuleFunctions(fileRelativePath, exportedNames) {
  const source = fs.readFileSync(new URL(fileRelativePath, import.meta.url), "utf8");
  let transformed = source;
  transformed = transformed.replace(/^import .*?;\n/gm, "");
  transformed = transformed.replace(/export class /g, "class ");
  transformed = transformed.replace(/export function /g, "function ");
  transformed = stripTypeScriptTypes(transformed);
  return new Function(`${transformed}\nreturn { ${exportedNames.join(", ")} };`)();
}

test("desktop local-actions executor performs bounded screenshot and download-organization actions", async () => {
  const { LocalActionsExecutor } = await loadModuleFunctions(
    "../src/main/local-actions/executor.ts",
    ["LocalActionsExecutor"],
  );

  const calls = [];
  const executor = new LocalActionsExecutor({
    captureFullScreen: async () => {
      calls.push("capture");
      return "/tmp/full-screen.png";
    },
    organizeDownloads: async () => {
      calls.push("organize");
      return {
        moved_count: 3,
        trashed_count: 1,
        summary: "Organized Downloads into folders and moved one temp file to trash",
      };
    },
  });
  const result = await executor.executePlan({
    actions: [
      { action_type: "capture_full_screen" },
      { action_type: "organize_downloads" },
    ],
  });

  assert.equal(result.executed.length, 2);
  assert.deepEqual(calls, ["capture", "organize"]);
  assert.deepEqual(result.executed.map((item) => item.status), ["succeeded", "succeeded"]);
  assert.match(result.executed[0].result_summary, /full-screen\.png/);
  assert.match(result.executed[1].result_summary, /Organized Downloads/);
});

test("desktop local-actions executor keeps recent execution history", async () => {
  const { LocalActionsExecutor } = await loadModuleFunctions(
    "../src/main/local-actions/executor.ts",
    ["LocalActionsExecutor"],
  );

  const executor = new LocalActionsExecutor({
    captureActiveWindow: async () => "/tmp/window.png",
  });
  await executor.executePlan({
    actions: [{ action_type: "capture_active_window" }],
  });

  const history = await executor.listHistory();
  assert.equal(history.length, 1);
  assert.equal(history[0]?.executed[0]?.action_type, "capture_active_window");
});

test("desktop local-actions executor supports low-risk file browse and open actions", async () => {
  const { LocalActionsExecutor } = await loadModuleFunctions(
    "../src/main/local-actions/executor.ts",
    ["LocalActionsExecutor"],
  );

  const calls = [];
  const executor = new LocalActionsExecutor({
    listDirectory: async () => {
      calls.push("list");
      return ["a.txt", "b.txt"];
    },
    openPath: async (target) => {
      calls.push(`open:${target}`);
    },
  });

  const result = await executor.executePlan({
    actions: [
      { action_type: "list_directory", target: "/tmp" },
      { action_type: "open_directory", target: "/tmp" },
      { action_type: "open_file", target: "/tmp/a.txt" },
    ],
  });

  assert.deepEqual(calls, ["list", "open:/tmp", "open:/tmp/a.txt"]);
  assert.deepEqual(
    result.executed.map((item) => item.status),
    ["succeeded", "succeeded", "succeeded"],
  );
});
