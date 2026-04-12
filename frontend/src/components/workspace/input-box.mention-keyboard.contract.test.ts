import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("@ mention popup uses Tab to switch tabs and Enter to select the active option", async () => {
  const source = await readFile(new URL("./input-box.tsx", import.meta.url), "utf8");

  assert.match(
    source,
    /if \(event\.key === "Tab" && mentionState\.trigger === "@"\) \{[\s\S]*setActiveMentionTab\(\(current\) => getNextAtMentionTab\(current\)\);[\s\S]*setMentionActiveIndex\(0\);[\s\S]*return;[\s\S]*\}/,
  );
  assert.match(
    source,
    /if \(event\.key === "Enter"\) \{[\s\S]*const currentOption = flatOptions\[mentionActiveIndex\];[\s\S]*applyMentionOption\(currentOption\);[\s\S]*\}/,
  );
  assert.doesNotMatch(source, /if \(event\.key === "Enter" \|\| event\.key === "Tab"\)/);
});
