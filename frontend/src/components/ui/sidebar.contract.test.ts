import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("sidebar content only scrolls vertically and clips horizontal overflow", async () => {
  const source = await readFile(
    new URL("./sidebar.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /const SIDEBAR_WIDTH_ICON = "4rem"/);
  assert.match(source, /overflow-y-auto/);
  assert.match(source, /overflow-x-hidden/);
  assert.doesNotMatch(source, /overflow-auto group-data-\[collapsible=icon\]:overflow-hidden/);
});

void test("sidebar collapsed mode widens the icon rail and centers menu icons", async () => {
  const source = await readFile(
    new URL("./sidebar.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /const SIDEBAR_WIDTH_ICON = "4rem"/);
  assert.match(source, /group-data-\[collapsible=icon\]:mx-auto/);
  assert.match(source, /group-data-\[collapsible=icon\]:justify-center/);
  assert.match(source, /group-data-\[collapsible=icon\]:gap-0/);
  assert.match(source, /group-data-\[collapsible=icon\]:\[&>span:last-child\]:w-0/);
  assert.match(source, /group-data-\[collapsible=icon\]:\[&>span:last-child\]:opacity-0/);
});

void test("workspace navigation menu opts into centered collapsed buttons", async () => {
  const source = await readFile(
    new URL("../workspace/workspace-nav-menu.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /group-data-\[collapsible=icon\]:mx-auto/);
});
