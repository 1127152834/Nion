import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const installerPath = join(repoRoot, "scripts", "install-llm-wiki-agent.py");
const fixturePath = join(repoRoot, "tests", "fixtures", "llm-wiki-agent-template");

test("installer creates the vendor repo, Codex skill, and initialized workspace", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "llm-wiki-agent-installer-"));
  const codexHome = join(sandbox, ".codex");
  const workspace = join(sandbox, "demo-wiki");

  try {
    const result = spawnSync(
      "python3",
      [
        installerPath,
        "--source",
        fixturePath,
        "--codex-home",
        codexHome,
        "--workspace",
        workspace,
      ],
      {
        encoding: "utf8",
        env: { ...process.env, CODEX_HOME: codexHome },
      },
    );

    assert.equal(result.status, 0, result.stderr || result.stdout);

    assert.ok(existsSync(join(codexHome, "vendor_imports", "llm-wiki-agent", "README.md")));
    assert.ok(existsSync(join(codexHome, "skills", "llm-wiki-agent", "SKILL.md")));
    assert.ok(
      existsSync(join(codexHome, "skills", "llm-wiki-agent", "scripts", "wiki-init.sh")),
    );
    assert.ok(existsSync(join(workspace, "AGENTS.md")));
    assert.ok(existsSync(join(workspace, "wiki", "index.md")));
    assert.ok(existsSync(join(workspace, "tools", "ingest.py")));

    const skillContents = readFileSync(
      join(codexHome, "skills", "llm-wiki-agent", "SKILL.md"),
      "utf8",
    );
    assert.match(skillContents, /llm-wiki-agent/);
    assert.match(skillContents, /wiki-init\.sh/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});
