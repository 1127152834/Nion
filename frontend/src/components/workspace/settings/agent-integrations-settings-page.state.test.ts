import assert from "node:assert/strict";
import test from "node:test";

const {
  formatArgs,
  formatEnv,
  parseArgs,
  parseEnv,
  setAgentConfig,
} = await import(
  new URL("./agent-integrations-settings-page.state.ts", import.meta.url).href,
);

void test("parseArgs trims blank lines and formatArgs joins values", () => {
  assert.deepEqual(parseArgs("  --foo  \n\n--bar\n"), ["--foo", "--bar"]);
  assert.equal(formatArgs(["--foo", "", "--bar"]), "--foo\n--bar");
});

void test("parseEnv keeps KEY=value lines and formatEnv serializes them", () => {
  assert.deepEqual(parseEnv("OPENAI_API_KEY=$OPENAI_API_KEY\nINVALID\nMODEL=gpt-5"), {
    OPENAI_API_KEY: "$OPENAI_API_KEY",
    MODEL: "gpt-5",
  });
  assert.equal(
    formatEnv({ OPENAI_API_KEY: "$OPENAI_API_KEY", MODEL: "gpt-5" }),
    "OPENAI_API_KEY=$OPENAI_API_KEY\nMODEL=gpt-5",
  );
});

void test("setAgentConfig upserts and removes acp_agents entries", () => {
  const withCodex = setAgentConfig({}, "codex", {
    command: "npx",
    args: ["-y", "@zed-industries/codex-acp"],
  });
  assert.deepEqual(withCodex, {
    acp_agents: {
      codex: {
        command: "npx",
        args: ["-y", "@zed-industries/codex-acp"],
      },
    },
  });

  const removed = setAgentConfig(withCodex, "codex", null);
  assert.deepEqual(removed, {});
});
