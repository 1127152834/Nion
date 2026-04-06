import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function loadModule(relativePath) {
  const absolutePath = new URL(relativePath, import.meta.url);
  const source = await readFile(absolutePath, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: absolutePath.pathname,
  });

  return import(
    `data:text/javascript;base64,${Buffer.from(transpiled.outputText).toString("base64")}`
  );
}

void test("createPromptInputFileParts preserves the original File object", async () => {
  const { createPromptInputFileParts } = await loadModule(
    "./prompt-input-files.ts",
  );

  const file = new File(["hello"], "hello.txt", { type: "text/plain" });
  const parts = createPromptInputFileParts([file], {
    createId: () => "attachment-1",
    createObjectURL: () => "blob:hello",
  });

  assert.equal(parts.length, 1);
  assert.equal(parts[0]?.id, "attachment-1");
  assert.equal(parts[0]?.file, file);
  assert.equal(parts[0]?.url, "blob:hello");
  assert.equal(parts[0]?.filename, "hello.txt");
  assert.equal(parts[0]?.mediaType, "text/plain");
});

void test("getFilesForUpload returns original File instances and reports missing files", async () => {
  const { getFilesForUpload } = await loadModule(
    "./prompt-input-files.ts",
  );

  const file = new File(["hello"], "hello.txt", { type: "text/plain" });
  const result = getFilesForUpload([
    {
      type: "file",
      filename: "hello.txt",
      mediaType: "text/plain",
      url: "blob:hello",
      file,
    },
    {
      type: "file",
      filename: "ghost.txt",
      mediaType: "text/plain",
      url: "blob:ghost",
    },
  ]);

  assert.deepEqual(result.files, [file]);
  assert.equal(result.missingCount, 1);
});
