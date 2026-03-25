"use client";

import { ExternalLinkIcon, KeyRoundIcon, SaveIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  ProviderInstanceRecord,
  ProviderProtocol,
  UpdateProviderInstancePayload,
} from "@/core/model-admin/types";

export function ProviderCredentialsForm({
  provider,
  onSave,
  onTest,
  isSaving,
  isTesting,
}: {
  provider: ProviderInstanceRecord;
  onSave: (payload: UpdateProviderInstancePayload) => Promise<void> | void;
  onTest: () => Promise<void> | void;
  isSaving?: boolean;
  isTesting?: boolean;
}) {
  const [displayName, setDisplayName] = useState(provider.display_name);
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState(provider.base_url_override ?? "");
  const [protocol, setProtocol] = useState<ProviderProtocol>(
    provider.protocol_override ?? provider.template?.protocol ?? "openai-compatible",
  );
  const [customHeaders, setCustomHeaders] = useState(
    provider.custom_headers_json
      ? JSON.stringify(provider.custom_headers_json, null, 2)
      : "",
  );
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(provider.display_name);
    setApiKey("");
    setBaseUrl(provider.base_url_override ?? "");
    setProtocol(
      provider.protocol_override ?? provider.template?.protocol ?? "openai-compatible",
    );
    setCustomHeaders(
      provider.custom_headers_json
        ? JSON.stringify(provider.custom_headers_json, null, 2)
        : "",
    );
    setSaveError(null);
  }, [provider]);

  const customProvider = provider.kind === "custom";
  const template = provider.template;
  const showProtocol = customProvider;
  const showBaseUrl = customProvider || template?.base_url_mode === "editable";
  const showDisplayName = customProvider;
  const apiKeyRequired = template?.requires_api_key ?? true;

  const testStatusLabel = useMemo(() => {
    if (provider.provider_test_status === "success") {
      return "Healthy";
    }
    if (provider.provider_test_status === "failed") {
      return "Needs attention";
    }
    return "Untested";
  }, [provider.provider_test_status]);

  const handleSave = async () => {
    setSaveError(null);
    let parsedHeaders: Record<string, string> | null = null;
    if (customHeaders.trim()) {
      try {
        parsedHeaders = JSON.parse(customHeaders) as Record<string, string>;
      } catch {
        setSaveError("Custom headers must be valid JSON.");
        return;
      }
    }

    try {
      await onSave({
        display_name: showDisplayName ? displayName : undefined,
        api_key: apiKey.trim() || undefined,
        base_url_override: showBaseUrl ? baseUrl.trim() || null : undefined,
        protocol_override: showProtocol ? protocol : undefined,
        custom_headers_json: customProvider ? parsedHeaders : undefined,
      });
      setApiKey("");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Failed to save provider");
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <KeyRoundIcon className="size-4" />
          Connection
        </div>
        <Badge variant={provider.provider_test_status === "failed" ? "destructive" : provider.provider_test_status === "success" ? "default" : "secondary"}>
          {testStatusLabel}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {showDisplayName ? (
          <label className="space-y-1.5 text-sm">
            <span className="font-medium">Display name</span>
            <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
          </label>
        ) : (
          <div className="space-y-1.5 text-sm">
            <div className="font-medium">Provider</div>
            <div className="rounded-lg border bg-muted/10 px-3 py-2">
              {provider.template?.name ?? provider.display_name}
            </div>
          </div>
        )}

        {showProtocol ? (
          <label className="space-y-1.5 text-sm">
            <span className="font-medium">Protocol</span>
            <Select
              value={protocol}
              onValueChange={(value) => setProtocol(value as ProviderProtocol)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai-compatible">OpenAI-compatible</SelectItem>
                <SelectItem value="anthropic-compatible">Anthropic-compatible</SelectItem>
              </SelectContent>
            </Select>
          </label>
        ) : null}

        <label className="space-y-1.5 text-sm md:col-span-2">
          <span className="font-medium">
            API key {apiKeyRequired ? "" : "(optional)"}
          </span>
          <Input
            type="password"
            placeholder={provider.api_key_masked ?? "Enter API key"}
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
          />
          {provider.template?.api_key_apply_url ? (
            <a
              className="text-primary inline-flex items-center gap-1 text-xs"
              href={provider.template.api_key_apply_url}
              target="_blank"
              rel="noreferrer"
            >
              Get API key
              <ExternalLinkIcon className="size-3.5" />
            </a>
          ) : null}
        </label>

        {showBaseUrl ? (
          <label className="space-y-1.5 text-sm md:col-span-2">
            <span className="font-medium">Base URL</span>
            <Input
              placeholder="https://api.example.com/v1"
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
            />
          </label>
        ) : null}

        {customProvider ? (
          <label className="space-y-1.5 text-sm md:col-span-2">
            <span className="font-medium">Custom headers (JSON)</span>
            <Textarea
              value={customHeaders}
              rows={4}
              onChange={(event) => setCustomHeaders(event.target.value)}
              placeholder='{"x-tenant-id":"demo"}'
            />
          </label>
        ) : null}
      </div>

      {provider.provider_test_message ? (
        <div className="rounded-xl border bg-muted/10 px-3 py-3 text-sm">
          <div className="font-medium">{provider.provider_test_message}</div>
          {provider.provider_test_latency_ms ? (
            <div className="text-muted-foreground mt-1 text-xs">
              {provider.provider_test_latency_ms} ms
            </div>
          ) : null}
        </div>
      ) : null}

      {saveError ? (
        <div className="text-destructive text-sm">{saveError}</div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => void onTest()} disabled={isTesting}>
          {isTesting ? "Testing provider..." : "Test provider connection"}
        </Button>
        <Button type="button" onClick={() => void handleSave()} disabled={isSaving}>
          <SaveIcon />
          {isSaving ? "Saving..." : "Save provider"}
        </Button>
      </div>
    </div>
  );
}
