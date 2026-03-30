import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("agent card renders built-in badges and hides delete for locked agents", async () => {
  const source = await readFile(new URL("./agent-card.tsx", import.meta.url), "utf8");

  assert.match(source, /agent\.visibility === "public"/);
  assert.match(source, /agent\.kind === "builtin"/);
  assert.match(source, /t\.agents\.builtinBadge/);
  assert.match(source, /pathOfNewAgentThread\(agent\.slug\)/);
  assert.match(source, /agent\.can_delete/);
  assert.match(source, /!\s*agent\.can_delete/);
});
