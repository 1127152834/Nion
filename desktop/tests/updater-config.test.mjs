import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import yaml from "yaml";

test("electron-builder publish config supports github and generic providers", () => {
  const config = yaml.parse(
    fs.readFileSync(new URL("../electron-builder.yml", import.meta.url), "utf8"),
  );
  assert.equal(config.publish[0].provider, "github");
  assert.equal(config.publish[1].provider, "generic");
});
