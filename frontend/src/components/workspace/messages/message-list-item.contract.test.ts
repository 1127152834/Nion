import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("human message content renders files above the bubble and selection tags below it", async () => {
  const source = await readFile(new URL("./message-list-item.tsx", import.meta.url), "utf8");

  assert.match(
    source,
    /<div className=\{cn\("ml-auto flex flex-col gap-2", className\)\}>\s*\{filesList\}\s*\{messageResponse &&[\s\S]*\{selectionTags\}/s,
  );
  assert.doesNotMatch(source, /shortcutBadges/);
});

void test("human selection tags are rendered as icon pills with two-item cap and overflow count", async () => {
  const source = await readFile(new URL("./message-list-item.tsx", import.meta.url), "utf8");

  assert.match(source, /const MAX_SELECTION_TAGS = 2/);
  assert.match(source, /selectionTags|selectionTagItems/);
  assert.match(source, /type:\s*"skill"\s*\|\s*"mcp"\s*\|\s*"cli"\s*\|\s*"context"/);
  assert.match(source, /return \[\.\.\.skillTags,\s*\.\.\.mcpTags,\s*\.\.\.cliTags,\s*\.\.\.contextTags\]/);
  assert.match(source, /\.slice\(0,\s*MAX_SELECTION_TAGS\)/);
  assert.match(source, /\.length > MAX_SELECTION_TAGS/);
  assert.match(source, /\+\s*\{[\w.]+\s*-\s*MAX_SELECTION_TAGS\}/);
  assert.match(source, /SparklesIcon|WrenchIcon|SquareTerminalIcon|AtSignIcon|FolderIcon|FileIcon/);
  assert.match(source, /tag\.type === "skill"/);
  assert.match(source, /tag\.type === "mcp"/);
  assert.match(source, /tag\.type === "cli"/);
});

void test("image attachments use the image preview card instead of tool output text", async () => {
  const source = await readFile(new URL("./message-list-item.tsx", import.meta.url), "utf8");

  assert.match(source, /if \(isImage\) \{\s*return \(\s*<a/s);
  assert.match(source, /<img\s+src=\{fileUrl\}\s+alt=\{file\.filename\}/s);
});
