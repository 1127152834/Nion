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

test("desktop local-actions executor returns skipped stub results", async () => {
  const { LocalActionsExecutor } = await loadModuleFunctions(
    "../src/main/local-actions/executor.ts",
    ["LocalActionsExecutor"],
  );

  const executor = new LocalActionsExecutor();
  const result = await executor.executePlan({
    actions: [
      { action_type: "capture_full_screen" },
      { action_type: "organize_downloads" },
    ],
  });

  assert.equal(result.executed.length, 2);
  assert.deepEqual(
    result.executed.map((item) => item.status),
    ["skipped", "skipped"],
  );
});
