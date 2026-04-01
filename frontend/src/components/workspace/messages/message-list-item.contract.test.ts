import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("human message content renders attachments above the message bubble", async () => {
  const source = await readFile(new URL("./message-list-item.tsx", import.meta.url), "utf8");

  assert.match(
    source,
    /<div className=\{cn\("ml-auto flex flex-col gap-2", className\)\}>\s*\{shortcutBadges\}\s*\{filesList\}\s*\{messageResponse &&/s,
  );
});

void test("image attachments use the image preview card instead of tool output text", async () => {
  const source = await readFile(new URL("./message-list-item.tsx", import.meta.url), "utf8");

  assert.match(source, /if \(isImage\) \{\s*return \(\s*<a/s);
  assert.match(source, /<img\s+src=\{fileUrl\}\s+alt=\{file\.filename\}/s);
});
