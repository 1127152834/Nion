"use client";

import { CircleCheckIcon, FlaskConicalIcon, PlusIcon, RefreshCcwIcon, Trash2Icon } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import type {
  ProviderDiscoveryModelOption,
  ProviderInstanceRecord,
} from "@/core/model-admin/types";

import { getProviderPrimaryModel } from "./types";

export function ProviderModelList({
  provider,
  discoveredModels,
  isDiscovering,
  onDiscover,
  onAddModels,
  onSetPrimary,
  onTestModel,
  onDeleteModel,
}: {
  provider: ProviderInstanceRecord;
  discoveredModels: ProviderDiscoveryModelOption[];
  isDiscovering?: boolean;
  onDiscover: () => Promise<void> | void;
  onAddModels: (models: Array<{ model_id: string; display_name?: string | null; source?: "manual" | "discovered" }>) => Promise<void> | void;
  onSetPrimary: (providerModelId: string) => Promise<void> | void;
  onTestModel: (providerModelId: string) => Promise<void> | void;
  onDeleteModel: (providerModelId: string) => Promise<void> | void;
}) {
  const [selectedDiscoveredIds, setSelectedDiscoveredIds] = useState<string[]>([]);
  const [manualModelId, setManualModelId] = useState("");
  const [manualDisplayName, setManualDisplayName] = useState("");
  const primaryModel = getProviderPrimaryModel(provider);
  const supportsDiscovery = provider.template?.supports_model_discovery ?? false;

  const discoveredById = useMemo(
    () =>
      new Map(discoveredModels.map((item) => [item.id, item])),
    [discoveredModels],
  );

  const toggleDiscoveredModel = (modelId: string) => {
    setSelectedDiscoveredIds((current) =>
      current.includes(modelId)
        ? current.filter((item) => item !== modelId)
        : [...current, modelId],
    );
  };

  const handleAddSelected = async () => {
    const models = selectedDiscoveredIds
      .map((item) => discoveredById.get(item))
      .filter((item): item is ProviderDiscoveryModelOption => Boolean(item))
      .map((item) => ({
        model_id: item.id,
        display_name: item.name ?? item.id,
        source: "discovered" as const,
      }));
    if (models.length === 0) {
      return;
    }
    await onAddModels(models);
    setSelectedDiscoveredIds([]);
  };

  const handleAddManual = async () => {
    const modelId = manualModelId.trim();
    if (!modelId) {
      return;
    }
    await onAddModels([
      {
        model_id: modelId,
        display_name: manualDisplayName.trim() || modelId,
        source: "manual",
      },
    ]);
    setManualModelId("");
    setManualDisplayName("");
  };

  return (
    <div className="space-y-4 rounded-2xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-semibold">Models</div>
        <Button type="button" variant="outline" onClick={() => void onDiscover()} disabled={!supportsDiscovery || isDiscovering}>
          <RefreshCcwIcon />
          {isDiscovering ? "Discovering..." : supportsDiscovery ? "Discover models" : "Manual entry only"}
        </Button>
      </div>

      {discoveredModels.length > 0 ? (
        <div className="space-y-3 rounded-xl border bg-muted/10 p-3">
          <div className="text-sm font-medium">Discovered models</div>
          <div className="grid gap-2 md:grid-cols-2">
            {discoveredModels.map((item) => {
              const checked = selectedDiscoveredIds.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleDiscoveredModel(item.id)}
                  className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                    checked ? "border-primary bg-primary/5" : "bg-background/80"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {item.name ?? item.id}
                      </div>
                      <div className="text-muted-foreground truncate text-xs">
                        {item.id}
                      </div>
                    </div>
                    {checked ? <CircleCheckIcon className="size-4 text-primary" /> : null}
                  </div>
                </button>
              );
            })}
          </div>
          <Button type="button" onClick={() => void handleAddSelected()} disabled={selectedDiscoveredIds.length === 0}>
            <PlusIcon />
            Add selected models
          </Button>
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <Input
          value={manualModelId}
          onChange={(event) => setManualModelId(event.target.value)}
          placeholder="Model ID"
        />
        <Input
          value={manualDisplayName}
          onChange={(event) => setManualDisplayName(event.target.value)}
          placeholder="Display name (optional)"
        />
        <Button type="button" variant="outline" onClick={() => void handleAddManual()}>
          <PlusIcon />
          Add model
        </Button>
      </div>

      {provider.models.length > 0 ? (
        <div className="space-y-2">
          {provider.models.map((model) => (
            <div key={model.id} className="rounded-xl border bg-muted/10 px-3 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {model.display_name}
                  </div>
                  <div className="text-muted-foreground truncate text-xs">
                    {model.model_id}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {primaryModel?.id === model.id ? (
                    <Badge>Primary</Badge>
                  ) : (
                    <Button type="button" size="sm" variant="outline" onClick={() => void onSetPrimary(model.id)}>
                      Set primary
                    </Button>
                  )}
                  <Button type="button" size="sm" variant="outline" onClick={() => void onTestModel(model.id)}>
                    <FlaskConicalIcon />
                    Test
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => void onDeleteModel(model.id)}>
                    <Trash2Icon />
                    Delete
                  </Button>
                </div>
              </div>
              {model.model_test_message ? (
                <div className="text-muted-foreground mt-2 text-xs">
                  {model.model_test_message}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <Empty className="min-h-[240px] border border-dashed bg-muted/10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FlaskConicalIcon />
            </EmptyMedia>
            <EmptyTitle>No models yet</EmptyTitle>
            <EmptyDescription>
              Discover remote models or add one manually to start binding runtime defaults.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  );
}
