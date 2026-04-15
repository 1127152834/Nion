import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("human messages disable incomplete markdown parsing", async () => {
  const source = await readFile(new URL("./message-list-item.tsx", import.meta.url), "utf8");

  assert.match(source, /parseIncompleteMarkdown=\{false\}/);
  assert.match(source, /extractKnowledgePageIdsFromToolMessage/);
  assert.match(source, /引用知识页|知识来源/);
  assert.match(source, /knowledge_sources|知识来源/);
});

void test("human messages render uploaded image files through the rich files list", async () => {
  const source = await readFile(new URL("./message-list-item.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(source, /useParams<\{ thread_id: string \}>/);
  assert.match(source, /threadId: string;/);
  assert.match(source, /const files = message\.additional_kwargs\?\.files;/);
  assert.match(source, /<RichFilesList files=\{files\} threadId=\{threadId\} \/>/);
  assert.match(source, /const imageFiles = files\.filter/);
  assert.match(source, /isImageFile\(file\.filename\)/);
  assert.match(source, /<img[\s\S]*src=\{fileUrl\}/);
  assert.match(source, /const filesList =[\s\S]*RichFilesList/);
  assert.match(source, /{filesList}\s*{messageResponse &&/);
});

void test("human multimodal image_url content is converted into rich file previews even without additional_kwargs files", async () => {
  const source = await readFile(new URL("./message-list-item.tsx", import.meta.url), "utf8");

  assert.match(source, /function imageFilesFromMultimodalContent/);
  assert.match(source, /candidate\.type !== "image_url"/);
  assert.match(source, /const multimodalImageFiles = imageFilesFromMultimodalContent\(message\);/);
  assert.match(source, /if \(multimodalImageFiles\.length > 0\) \{\s*return multimodalImageFiles;/s);
});
