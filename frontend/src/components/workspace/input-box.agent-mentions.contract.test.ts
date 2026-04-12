import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("@ mention popup exposes notebook and agent tabs and loads agent options from the catalog", async () => {
  const source = await readFile(new URL("./input-box.tsx", import.meta.url), "utf8");

  assert.match(source, /useAgents\(\)/);
  assert.match(source, /label:\s*"Notebook"/);
  assert.match(source, /label:\s*"智能体"/);
  assert.match(source, /activeMentionTab/);
  assert.match(source, /agentMentionOptions/);
});

void test("input box highlights and summarizes selected agent mentions with a dedicated agent style", async () => {
  const source = await readFile(new URL("./input-box.tsx", import.meta.url), "utf8");

  assert.match(source, /type:\s*"agent"/);
  assert.match(source, /selectedAgents/);
  assert.match(source, /BotIcon/);
  assert.match(source, /bg-emerald-500\/30|bg-orange-500\/30|bg-cyan-500\/30/);
});
