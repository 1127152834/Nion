import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("desktop main window logs renderer console output via WebContentsConsoleMessageEventParams details", () => {
  const source = fs.readFileSync(
    new URL("../src/main/window.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /webContents\.on\("console-message", \(details\) =>/);
  assert.match(source, /details\.level/);
  assert.match(source, /details\.sourceId/);
  assert.match(source, /details\.lineNumber/);
  assert.match(source, /details\.message/);
});
