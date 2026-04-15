import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("thread submit payload forwards selected CLI tools in both additional kwargs and runtime context", async () => {
  const source = await readFile(new URL("./hooks.ts", import.meta.url), "utf8");

  assert.match(source, /messageAdditionalKwargs\.shortcut_selections = shortcutSelections/);
  assert.match(source, /selected_cli_tools: shortcutSelections\?\.cliTools \?\? \[\]/);
});

void test("input box includes selected CLI tools in shortcut selections payload", async () => {
  const source = await readFile(
    new URL("../../components/workspace/input-box.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /shortcutSelections: \{\s*contexts: selectedContexts,\s*skills: selectedSkills,\s*mcpTools: selectedMcpTools,\s*cliTools: selectedCliTools,/s);
});

void test("input box does not append selected CLI tools back into the visible message text", async () => {
  const source = await readFile(
    new URL("../../components/workspace/input-box.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /implicitMentions\.push\(\{ kind, value, mention \}\)/);
  assert.match(source, /for \(const tool of selectedCliTools\)/);
  assert.doesNotMatch(source, /appendImplicitMention\("cli", tool, `#\$\{tool\}`\)/);
});
