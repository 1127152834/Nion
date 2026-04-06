import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("soul growth timeline explains recent growth instead of raw artifacts", async () => {
  const source = await readFile(
    new URL("./soul-growth-timeline.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /Recent Growth|最近成长/);
  assert.match(source, /不显示.*raw|不默认展示.*raw|不展示.*raw/s);
  assert.match(source, /为什么发生了变化|最近为什么发生了变化/);
  assert.match(source, /刚刚生效|已回退|rollback|accept/i);
});
