import type { Translations } from "../../../core/i18n/locales/types";

type AgentIntegrationsTranslations = Translations["settings"]["agentIntegrations"];

export type AgentIntegrationCatalogItem = {
  configKey: string;
  title: string;
  description: string;
  commandDefault: string;
  argsDefault: string[];
};

export type AgentIntegrationsCopy = {
  page: AgentIntegrationsTranslations;
  catalog: {
    codex: AgentIntegrationCatalogItem;
    claudeCode: AgentIntegrationCatalogItem;
  };
};

export function buildAgentIntegrationsCopy(
  source: AgentIntegrationsTranslations,
): AgentIntegrationsCopy {
  return {
    page: source,
    catalog: {
      codex: {
        configKey: "codex",
        title: source.knownAgents.codex,
        description: "Codex ACP adapter for repository work and code generation.",
        commandDefault: "npx",
        argsDefault: ["-y", "@zed-industries/codex-acp"],
      },
      claudeCode: {
        configKey: "claude_code",
        title: source.knownAgents.claudeCode,
        description:
          "Claude Code ACP adapter for implementation, refactoring, and debugging.",
        commandDefault: "npx",
        argsDefault: ["-y", "@zed-industries/claude-agent-acp"],
      },
    },
  };
}
