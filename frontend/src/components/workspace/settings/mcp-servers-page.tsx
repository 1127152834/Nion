"use client";

import {
  CheckCircle2Icon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from "@/components/ui/item";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/core/i18n/hooks";
import {
  useMCPConfig,
  useMCPServerProbe,
  useUpdateMCPConfig,
} from "@/core/mcp/hooks";
import type { MCPConfig, MCPServerConfig, MCPServerType } from "@/core/mcp/types";

import { ConfigSaveBar } from "./configuration/config-save-bar";
import { ConfirmActionDialog } from "./confirm-action-dialog";
import { SettingsSection } from "./settings-section";

const FALLBACK_COPY = {
  title: "MCP servers",
  description: "Manage MCP server connections and available tools.",
  addServer: "Add server",
  edit: "Edit",
  remove: "Remove",
  close: "Close",
  save: "Save",
  create: "Create",
  enabled: "Enabled",
  statusDisabled: "Disabled",
  statusTesting: "Testing...",
  statusConnected: "Connected",
  statusFailed: "Connection failed",
  retry: "Retry",
  toolsLabel: "Available tools",
  emptyServer: "No MCP servers configured",
  loadConfigFailed: "Failed to load MCP config",
  deleteConfirmTitle: "Confirm deletion",
  deleteConfirmDescription:
    'Delete MCP server "{name}"? This action cannot be undone.',
  editorAddTitle: "Add MCP server",
  editorEditTitle: "Edit MCP server",
  serverKey: "Server key",
  serverKeyPlaceholder: "my-mcp-server",
  descriptionLabel: "Description",
  descriptionPlaceholder: "Optional description",
  transportType: "Transport type",
  stdio: "stdio",
  http: "http",
  sse: "sse",
  command: "Command",
  commandPlaceholder: "uvx / npx / python -m ...",
  args: "Arguments (one per line)",
  url: "URL",
  urlPlaceholder: "https://example.com/sse",
  env: "Environment (KEY=value per line)",
  headers: "Headers (KEY=value per line)",
} as const;

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value ?? {})) as T;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(value ?? {});
}

function normalizeServerKey(raw: string): string {
  const input = String(raw ?? "").trim().toLowerCase();
  if (!input) return "server";
  const dashed = input
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
  return dashed || "server";
}

function parseKeyValueText(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rawLine of String(text ?? "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    if (!key) continue;
    out[key] = line.slice(idx + 1);
  }
  return out;
}

function toKeyValueText(value: Record<string, string> | undefined): string {
  return Object.entries(value ?? {})
    .map(([key, item]) => `${key}=${item}`)
    .join("\n");
}

function toArgLines(value: string[] | undefined): string {
  return Array.isArray(value) ? value.join("\n") : "";
}

function summarizeConfig(config: MCPServerConfig): string {
  const type = typeof config.type === "string" ? config.type : "stdio";
  if (type === "stdio") {
    const command = typeof config.command === "string" ? config.command : "";
    const args = Array.isArray(config.args) ? config.args.join(" ") : "";
    return [type, command, args].filter(Boolean).join(" ");
  }
  const url = typeof config.url === "string" ? config.url : "";
  return [type, url].filter(Boolean).join(" · ");
}

type EditorState = {
  serverName: string;
  config: MCPServerConfig;
};

function emptyServerConfig(): MCPServerConfig {
  return {
    enabled: true,
    type: "stdio",
    command: "",
    args: [],
    env: {},
    url: "",
    headers: {},
    description: "",
  };
}

export function MCPServersPage() {
  const { t } = useI18n();
  const copy = {
    ...FALLBACK_COPY,
    title: t.settings.mcpServers?.title ?? FALLBACK_COPY.title,
    description: t.settings.mcpServers?.description ?? FALLBACK_COPY.description,
  };
  const { config, isLoading, error } = useMCPConfig();
  const updateMutation = useUpdateMCPConfig();
  const probeMutation = useMCPServerProbe();
  const [draftConfig, setDraftConfig] = useState<MCPConfig | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [probeResults, setProbeResults] = useState<
    Record<
      string,
      { success: boolean; message: string; tools: string[]; toolCount: number }
    >
  >({});

  const activeConfig = useMemo(
    () => draftConfig ?? config ?? { mcp_servers: {} },
    [config, draftConfig],
  );
  const dirty = useMemo(() => {
    if (!config) {
      return false;
    }
    return stableStringify(activeConfig) !== stableStringify(config);
  }, [activeConfig, config]);

  const servers = useMemo(
    () =>
      Object.entries(activeConfig.mcp_servers).sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    [activeConfig],
  );

  const beginEdit = (serverName?: string, server?: MCPServerConfig) => {
    setEditor({
      serverName: serverName ?? "",
      config: deepClone(server ?? emptyServerConfig()),
    });
  };

  const ensureDraft = () => deepClone(activeConfig);

  const handleSaveAll = async () => {
    try {
      await updateMutation.mutateAsync(activeConfig);
      setDraftConfig(null);
      toast.success(t.common.save);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : copy.loadConfigFailed);
    }
  };

  const handleToggleEnabled = (serverName: string, enabled: boolean) => {
    const next = ensureDraft();
    next.mcp_servers[serverName] = {
      ...next.mcp_servers[serverName],
      enabled,
    };
    setDraftConfig(next);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    const next = ensureDraft();
    delete next.mcp_servers[deleteTarget];
    setDraftConfig(next);
    setDeleteTarget(null);
  };

  const handleProbe = async (serverName: string) => {
    try {
      const result = await probeMutation.mutateAsync(serverName);
      setProbeResults((current) => ({
        ...current,
        [serverName]: {
          success: result.success,
          message: result.message,
          tools: result.tools,
          toolCount: result.tool_count,
        },
      }));
    } catch (err) {
      setProbeResults((current) => ({
        ...current,
        [serverName]: {
          success: false,
          message: err instanceof Error ? err.message : copy.statusFailed,
          tools: [],
          toolCount: 0,
        },
      }));
    }
  };

  const handleEditorSave = () => {
    if (!editor) return;
    const serverKey = normalizeServerKey(editor.serverName);
    if (!serverKey) return;

    const next = ensureDraft();
    next.mcp_servers[serverKey] = {
      ...editor.config,
      type: editor.config.type ?? "stdio",
      args: Array.isArray(editor.config.args) ? editor.config.args : [],
      env: editor.config.env ?? {},
      headers: editor.config.headers ?? {},
      description: editor.config.description ?? "",
    };
    setDraftConfig(next);
    setEditor(null);
  };

  return (
    <SettingsSection title={copy.title} description={copy.description}>
      {isLoading ? (
        <div className="text-muted-foreground text-sm">{t.common.loading}</div>
      ) : error ? (
        <div className="text-destructive text-sm">
          {error instanceof Error ? error.message : copy.loadConfigFailed}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => beginEdit()}>
              <PlusIcon className="size-4" />
              {copy.addServer}
            </Button>
          </div>

          {servers.length === 0 ? (
            <div className="text-muted-foreground rounded-md border border-dashed px-3 py-4 text-sm">
              {copy.emptyServer}
            </div>
          ) : (
            <div className="space-y-3">
              {servers.map(([serverName, server]) => {
                const probe = probeResults[serverName];
                return (
                  <Item key={serverName} variant="outline" className="w-full">
                    <ItemContent>
                      <ItemTitle>{serverName}</ItemTitle>
                      <ItemDescription>
                        {server.description?.trim() ?? summarizeConfig(server)}
                      </ItemDescription>
                      {probe ? (
                        <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-xs">
                          <span
                            className={
                              probe.success ? "text-emerald-700" : "text-amber-700"
                            }
                          >
                            {probe.success
                              ? copy.statusConnected
                              : copy.statusFailed}
                          </span>
                          <span>{probe.message}</span>
                          {probe.toolCount > 0 && (
                            <span>
                              {copy.toolsLabel}: {probe.tools.join(", ")}
                            </span>
                          )}
                        </div>
                      ) : null}
                    </ItemContent>
                    <ItemActions>
                      <Switch
                        checked={server.enabled}
                        onCheckedChange={(checked) =>
                          handleToggleEnabled(serverName, checked)
                        }
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleProbe(serverName)}
                        disabled={probeMutation.isPending}
                      >
                        {probeMutation.isPending ? (
                          <Loader2Icon className="size-4 animate-spin" />
                        ) : probe?.success ? (
                          <CheckCircle2Icon className="size-4" />
                        ) : (
                          copy.retry
                        )}
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="outline"
                        onClick={() => beginEdit(serverName, server)}
                      >
                        <PencilIcon className="size-4" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="destructive"
                        onClick={() => setDeleteTarget(serverName)}
                      >
                        <Trash2Icon className="size-4" />
                      </Button>
                    </ItemActions>
                  </Item>
                );
              })}
            </div>
          )}

          <ConfigSaveBar
            dirty={dirty}
            disabled={updateMutation.isPending}
            saving={updateMutation.isPending}
            onDiscard={() => setDraftConfig(null)}
            onSave={() => {
              void handleSaveAll();
            }}
          />
        </div>
      )}

      <Dialog open={editor !== null} onOpenChange={(open) => !open && setEditor(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editor?.serverName ? copy.edit : copy.addServer}
            </DialogTitle>
          </DialogHeader>
          {editor && (
            <ScrollArea className="max-h-[70vh] pr-2">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="text-xs font-medium">{copy.serverKey}</div>
                  <Input
                    value={editor.serverName}
                    placeholder={copy.serverKeyPlaceholder}
                    onChange={(e) =>
                      setEditor((current) =>
                        current
                          ? { ...current, serverName: e.target.value }
                          : current,
                      )
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="text-xs font-medium">
                    {copy.descriptionLabel}
                  </div>
                  <Input
                    value={editor.config.description ?? ""}
                    placeholder={copy.descriptionPlaceholder}
                    onChange={(e) =>
                      setEditor((current) =>
                        current
                          ? {
                              ...current,
                              config: {
                                ...current.config,
                                description: e.target.value,
                              },
                            }
                          : current,
                      )
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="text-xs font-medium">{copy.transportType}</div>
                  <Select
                    value={
                      typeof editor.config.type === "string"
                        ? editor.config.type
                        : "stdio"
                    }
                    onValueChange={(value) =>
                      setEditor((current) =>
                        current
                          ? {
                              ...current,
                              config: {
                                ...current.config,
                                type: value as MCPServerType,
                              },
                            }
                          : current,
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stdio">{copy.stdio}</SelectItem>
                      <SelectItem value="http">{copy.http}</SelectItem>
                      <SelectItem value="sse">{copy.sse}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(editor.config.type ?? "stdio") === "stdio" ? (
                  <>
                    <div className="space-y-1.5">
                      <div className="text-xs font-medium">{copy.command}</div>
                      <Input
                        value={editor.config.command ?? ""}
                        placeholder={copy.commandPlaceholder}
                        onChange={(e) =>
                          setEditor((current) =>
                            current
                              ? {
                                  ...current,
                                  config: {
                                    ...current.config,
                                    command: e.target.value,
                                  },
                                }
                              : current,
                          )
                        }
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="text-xs font-medium">{copy.args}</div>
                      <Textarea
                        value={toArgLines(editor.config.args)}
                        onChange={(e) =>
                          setEditor((current) =>
                            current
                              ? {
                                  ...current,
                                  config: {
                                    ...current.config,
                                    args: e.target.value
                                      .split(/\r?\n/)
                                      .map((line) => line.trim())
                                      .filter(Boolean),
                                  },
                                }
                              : current,
                          )
                        }
                      />
                    </div>
                  </>
                ) : (
                  <div className="space-y-1.5">
                    <div className="text-xs font-medium">{copy.url}</div>
                    <Input
                      value={editor.config.url ?? ""}
                      placeholder={copy.urlPlaceholder}
                      onChange={(e) =>
                        setEditor((current) =>
                          current
                            ? {
                                ...current,
                                config: {
                                  ...current.config,
                                  url: e.target.value,
                                },
                              }
                            : current,
                        )
                      }
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className="text-xs font-medium">{copy.env}</div>
                  <Textarea
                    value={toKeyValueText(editor.config.env)}
                    onChange={(e) =>
                      setEditor((current) =>
                        current
                          ? {
                              ...current,
                              config: {
                                ...current.config,
                                env: parseKeyValueText(e.target.value),
                              },
                            }
                          : current,
                      )
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="text-xs font-medium">{copy.headers}</div>
                  <Textarea
                    value={toKeyValueText(editor.config.headers)}
                    onChange={(e) =>
                      setEditor((current) =>
                        current
                          ? {
                              ...current,
                              config: {
                                ...current.config,
                                headers: parseKeyValueText(e.target.value),
                              },
                            }
                          : current,
                      )
                    }
                  />
                </div>

                <label className="flex items-center justify-between gap-2 rounded-md border p-3 text-sm">
                  <span>{copy.enabled}</span>
                  <Switch
                    checked={editor.config.enabled}
                    onCheckedChange={(checked) =>
                      setEditor((current) =>
                        current
                          ? {
                              ...current,
                              config: { ...current.config, enabled: checked },
                            }
                          : current,
                      )
                    }
                  />
                </label>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setEditor(null)}>
                    {copy.close}
                  </Button>
                  <Button onClick={handleEditorSave}>
                    {editor.serverName ? copy.save : copy.create}
                  </Button>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmActionDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={copy.deleteConfirmTitle}
        description={copy.deleteConfirmDescription.replace(
          "{name}",
          deleteTarget ?? "",
        )}
        confirmText={copy.remove}
        confirmVariant="destructive"
        onConfirm={handleDelete}
      />
    </SettingsSection>
  );
}
