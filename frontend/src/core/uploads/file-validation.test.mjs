import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

async function loadModule(relativePath) {
  const absolutePath = path.resolve(process.cwd(), "..", relativePath);
  const source = await readFile(absolutePath, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: absolutePath,
  });

  return import(
    `data:text/javascript;base64,${Buffer.from(transpiled.outputText).toString("base64")}`
  );
}

void test("validatePromptInputFiles rejects .app bundles before accept filtering", async () => {
  const { validatePromptInputFiles } = await loadModule(
    "frontend/src/core/uploads/file-validation.ts",
  );

  const appBundle = new File(["bundle"], "Nion.app", {
    type: "application/octet-stream",
  });

  const result = validatePromptInputFiles([appBundle], {
    accept: "application/octet-stream",
  });

  assert.equal(result.accepted.length, 0);
  assert.deepEqual(result.errors, [
    {
      code: "invalid_file",
      message: "Application bundles (.app) are not supported.",
    },
  ]);
});

void test("validatePromptInputFiles keeps valid files when some are rejected", async () => {
  const { validatePromptInputFiles } = await loadModule(
    "frontend/src/core/uploads/file-validation.ts",
  );

  const appBundle = new File(["bundle"], "Desktop.app", {
    type: "application/octet-stream",
  });
  const image = new File(["image"], "photo.png", { type: "image/png" });

  const result = validatePromptInputFiles([appBundle, image], {
    accept: "image/*",
  });

  assert.deepEqual(result.accepted, [image]);
  assert.deepEqual(result.errors, [
    {
      code: "invalid_file",
      message: "Application bundles (.app) are not supported.",
    },
  ]);
});

void test("validatePromptInputFiles does not emit max_file_size when at least one file remains valid", async () => {
  const { validatePromptInputFiles } = await loadModule(
    "frontend/src/core/uploads/file-validation.ts",
  );

  const oversized = new File(["123456"], "large.txt", {
    type: "text/plain",
  });
  const valid = new File(["1"], "small.txt", { type: "text/plain" });

  const result = validatePromptInputFiles([oversized, valid], {
    accept: "text/plain",
    maxFileSize: 2,
  });

  assert.deepEqual(result.accepted, [valid]);
  assert.deepEqual(result.errors, []);
});
