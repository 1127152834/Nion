import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("memory console panel owns search overview and fact management", async () => {
  const source = await readFile(
    new URL("./memory-console-panel.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /searchPlaceholder|记忆检索|Memory Search/);
  assert.match(source, /current memory overview|当前记忆概览|overview/i);
  assert.match(source, /onClearAll|onDeleteFact|clearAll/);
});
