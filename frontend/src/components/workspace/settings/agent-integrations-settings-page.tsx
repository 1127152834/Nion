"use client";

import { BotIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/core/i18n/hooks";

import { buildAgentIntegrationsCopy } from "./agent-integrations-settings-page.copy";
import { ConfigValidationErrors } from "./config-validation-errors";
import { ConfigSaveBar } from "./configuration/config-save-bar";
import {
  asObject,
  asString,
  cloneConfig,
  type ConfigDraft,
} from "./configuration/shared";
import { SettingsSection } from "./settings-section";
import { useConfigEditor } from "./use-config-editor";

type AgentConfigKey = "codex" | "claude_code";

function formatArgs(value: unknown): string {
  if (!Array.isArray(value)) {
    return "";
  }
  return value
    .map((item) => asString(item).trim())
    .filter((item) => item.length > 0)
    .join("\n");
}

function parseArgs(raw: string): string[] {
  return raw
    .split("\n")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function formatEnv(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "";
  }
  return Object.entries(value as Record<string, unknown>)
    .map(([key, rawValue]) => `${key}=${asString(rawValue)}`)
    .join("\n");
}

function parseEnv(raw: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    const separator = trimmed.indexOf("=");
    if (separator <= 0) {
      continue;
    }
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    if (key) {
      env[key] = value;
    }
  }
  return env;
}

function getAgentConfig(
  config: ConfigDraft,
  agentKey: AgentConfigKey,
): Record<string, unknown> {
  return asObject(asObject(config.acp_agents)[agentKey]);
}

function setAgentConfig(
  config: ConfigDraft,
  agentKey: AgentConfigKey,
  nextValue: Record<string, unknown> | null,
): ConfigDraft {
  const next = cloneConfig(config);
  const agents = asObject(next.acp_agents);
  if (nextValue == null) {
    delete agents[agentKey];
  } else {
    agents[agentKey] = nextValue;
  }
  if (Object.keys(agents).length === 0) {
    delete next.acp_agents;
  } else {
    next.acp_agents = agents;
  }
  return next;
}

export function AgentIntegrationsSettingsPage() {
  const { t } = useI18n();
  const copy = buildAgentIntegrationsCopy(t.settings.agentIntegrations);
  const {
    draftConfig,
    validationErrors,
    validationWarnings,
    isLoading,
    error,
    dirty,
    disabled,
    saving,
    onConfigChange,
    onDiscard,
    onSave,
  } = useConfigEditor();

  const agents = [
    copy.catalog.codex,
    copy.catalog.claudeCode,
  ] as const;

  return (
    <SettingsSection
      title={copy.page.title}
      description={copy.page.description}
    >
      {isLoading ? (
        <div className="text-muted-foreground text-sm">{t.common.loading}</div>
      ) : error ? (
        <div className="text-destructive text-sm">
          {error instanceof Error ? error.message : copy.page.empty}
        </div>
      ) : (
        <div className="space-y-4">
          {agents.map((agent) => {
            const config = getAgentConfig(draftConfig, agent.configKey as AgentConfigKey);
            const enabled = Object.keys(config).length > 0;

            return (
              <section
                key={agent.configKey}
                className="space-y-4 rounded-xl border bg-background/80 p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <BotIcon className="size-4" />
                      <div className="text-sm font-semibold">{agent.title}</div>
                    </div>
                    <div className="text-muted-foreground text-sm">
                      {agent.description}
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={enabled}
                      disabled={disabled}
                      onCheckedChange={(checked) => {
                        if (!checked) {
                          onConfigChange(
                            setAgentConfig(
                              draftConfig,
                              agent.configKey as AgentConfigKey,
                              null,
                            ),
                          );
                          return;
                        }
                        onConfigChange(
                          setAgentConfig(
                            draftConfig,
                            agent.configKey as AgentConfigKey,
                            {
                              command: agent.commandDefault,
                              args: agent.argsDefault,
                              description: agent.description,
                              model: "",
                              env: {},
                              auto_approve_permissions: false,
                            },
                          ),
                        );
                      }}
                    />
                    {copy.page.fields.enabled}
                  </label>
                </div>

                {enabled ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-1.5">
                      <div className="text-xs font-medium">
                        {copy.page.fields.command}
                      </div>
                      <Input
                        value={asString(config.command)}
                        disabled={disabled}
                        onChange={(event) =>
                          onConfigChange(
                            setAgentConfig(
                              draftConfig,
                              agent.configKey as AgentConfigKey,
                              { ...config, command: event.target.value },
                            ),
                          )
                        }
                      />
                    </label>

                    <label className="space-y-1.5">
                      <div className="text-xs font-medium">
                        {copy.page.fields.model}
                      </div>
                      <Input
                        value={asString(config.model)}
                        disabled={disabled}
                        onChange={(event) =>
                          onConfigChange(
                            setAgentConfig(
                              draftConfig,
                              agent.configKey as AgentConfigKey,
                              { ...config, model: event.target.value },
                            ),
                          )
                        }
                      />
                    </label>

                    <label className="space-y-1.5 md:col-span-2">
                      <div className="text-xs font-medium">
                        {copy.page.fields.args}
                      </div>
                      <textarea
                        className="border-input bg-background min-h-24 w-full rounded-md border px-3 py-2 text-sm"
                        value={formatArgs(config.args)}
                        disabled={disabled}
                        onChange={(event) =>
                          onConfigChange(
                            setAgentConfig(
                              draftConfig,
                              agent.configKey as AgentConfigKey,
                              { ...config, args: parseArgs(event.target.value) },
                            ),
                          )
                        }
                      />
                    </label>

                    <label className="space-y-1.5 md:col-span-2">
                      <div className="text-xs font-medium">
                        {copy.page.fields.description}
                      </div>
                      <Input
                        value={asString(config.description)}
                        disabled={disabled}
                        onChange={(event) =>
                          onConfigChange(
                            setAgentConfig(
                              draftConfig,
                              agent.configKey as AgentConfigKey,
                              { ...config, description: event.target.value },
                            ),
                          )
                        }
                      />
                    </label>

                    <label className="space-y-1.5 md:col-span-2">
                      <div className="text-xs font-medium">
                        {copy.page.fields.env}
                      </div>
                      <textarea
                        className="border-input bg-background min-h-24 w-full rounded-md border px-3 py-2 font-mono text-sm"
                        value={formatEnv(config.env)}
                        disabled={disabled}
                        onChange={(event) =>
                          onConfigChange(
                            setAgentConfig(
                              draftConfig,
                              agent.configKey as AgentConfigKey,
                              { ...config, env: parseEnv(event.target.value) },
                            ),
                          )
                        }
                      />
                    </label>

                    <label className="flex items-center gap-2 text-sm md:col-span-2">
                      <Switch
                        checked={Boolean(config.auto_approve_permissions)}
                        disabled={disabled}
                        onCheckedChange={(checked) =>
                          onConfigChange(
                            setAgentConfig(
                              draftConfig,
                              agent.configKey as AgentConfigKey,
                              {
                                ...config,
                                auto_approve_permissions: checked,
                              },
                            ),
                          )
                        }
                      />
                      {copy.page.fields.autoApprovePermissions}
                    </label>
                  </div>
                ) : (
                  <div className="text-muted-foreground text-sm">
                    {copy.page.empty}
                  </div>
                )}
              </section>
            );
          })}

          <ConfigValidationErrors
            errors={validationErrors}
            warnings={validationWarnings}
          />
          <ConfigSaveBar
            dirty={dirty}
            disabled={disabled}
            saving={saving}
            onDiscard={onDiscard}
            onSave={() => {
              void onSave();
            }}
          />
        </div>
      )}
    </SettingsSection>
  );
}
