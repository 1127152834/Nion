"use client";

import { ArrowLeftIcon, DatabaseZapIcon } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import {
  useAddProviderModels,
  useDeleteProviderModel,
  useDiscoverProviderModels,
  useTestProviderInstance,
  useTestProviderModel,
  useUpdateBinding,
  useUpdateProviderInstance,
  useUpdateProviderModel,
} from "@/core/model-admin/hooks";
import type {
  ProviderCategory,
  ProviderDiscoveryModelOption,
  ProviderInstanceRecord,
  ProviderTemplate,
  UpdateProviderInstancePayload,
} from "@/core/model-admin/types";

import { ProviderCredentialsForm } from "./provider-credentials-form";
import { ProviderModelList } from "./provider-model-list";

function providerStatusVariant(status: ProviderInstanceRecord["provider_test_status"]) {
  if (status === "success") {
    return "default";
  }
  if (status === "failed") {
    return "destructive";
  }
  return "secondary";
}

export function ProviderDetail({
  provider,
  category,
  onBackToMarketplace,
  customCreateMode = false,
  onCreateCustomProvider,
  customTemplate,
  copy,
}: {
  provider?: ProviderInstanceRecord | null;
  category: ProviderCategory;
  onBackToMarketplace: (category: ProviderCategory) => void;
  customCreateMode?: boolean;
  onCreateCustomProvider?: () => void;
  customTemplate?: ProviderTemplate | null;
  copy: {
    backToMarketplace: string;
    providerSummary: string;
    credentialsTitle: string;
    credentialsDescription: string;
    modelsTitle: string;
    modelsDescription: string;
    emptyModelsTitle: string;
    emptyModelsDescription: string;
    customCreateTitle: string;
    customCreateDescription: string;
    customCreateAction: string;
    untested: string;
    success: string;
    failed: string;
  };
}) {
  const updateProvider = useUpdateProviderInstance();
  const testProvider = useTestProviderInstance();
  const discoverModels = useDiscoverProviderModels();
  const addModels = useAddProviderModels();
  const updateProviderModel = useUpdateProviderModel();
  const testProviderModel = useTestProviderModel();
  const deleteProviderModel = useDeleteProviderModel();
  const updateBinding = useUpdateBinding();
  const [discoveredModels, setDiscoveredModels] = useState<
    ProviderDiscoveryModelOption[]
  >([]);
  const [actionError, setActionError] = useState<string | null>(null);

  if (customCreateMode) {
    return (
      <div className="space-y-4 rounded-2xl border bg-background p-4">
        <Button
          type="button"
          variant="ghost"
          className="px-0"
          onClick={() => onBackToMarketplace(category)}
        >
          <ArrowLeftIcon />
          {copy.backToMarketplace}
        </Button>

        <div className="space-y-2">
          <div className="text-base font-semibold">{copy.customCreateTitle}</div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {copy.customCreateDescription}
          </p>
        </div>

        <div className="rounded-2xl border border-dashed bg-muted/10 p-5">
          <div className="text-sm font-medium">
            {customTemplate?.name ?? copy.customCreateTitle}
          </div>
          <p className="text-muted-foreground mt-2 text-sm">
            {customTemplate?.description ?? copy.customCreateDescription}
          </p>
          <Button
            type="button"
            className="mt-4"
            onClick={onCreateCustomProvider}
          >
            {copy.customCreateAction}
          </Button>
        </div>
      </div>
    );
  }

  if (!provider) {
    return (
      <Empty className="min-h-[420px] rounded-2xl border bg-muted/10">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <DatabaseZapIcon />
          </EmptyMedia>
          <EmptyTitle>{copy.emptyModelsTitle}</EmptyTitle>
          <EmptyDescription>{copy.emptyModelsDescription}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const statusLabel =
    provider.provider_test_status === "success"
      ? copy.success
      : provider.provider_test_status === "failed"
        ? copy.failed
        : copy.untested;

  const handleSaveProvider = async (payload: UpdateProviderInstancePayload) => {
    setActionError(null);
    try {
      await updateProvider.mutateAsync({ providerId: provider.id, payload });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to save provider");
      throw error;
    }
  };

  const handleTestProvider = async () => {
    setActionError(null);
    try {
      await testProvider.mutateAsync({ providerId: provider.id });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to test provider");
    }
  };

  const handleDiscoverModels = async () => {
    setActionError(null);
    try {
      const result = await discoverModels.mutateAsync({ providerId: provider.id });
      setDiscoveredModels(result.result.models);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to discover models");
    }
  };

  const handleAddModels = async (
    models: Array<{ model_id: string; display_name?: string | null; source?: "manual" | "discovered" }>,
  ) => {
    setActionError(null);
    try {
      await addModels.mutateAsync({
        providerId: provider.id,
        payload: { models },
      });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to add models");
    }
  };

  const handleSetPrimary = async (providerModelId: string) => {
    setActionError(null);
    try {
      await updateProviderModel.mutateAsync({
        modelId: providerModelId,
        payload: { is_primary: true },
      });
      await updateBinding.mutateAsync({
        bindingKey: "chat.default",
        payload: { provider_model_id: providerModelId },
      });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to update primary model");
    }
  };

  const handleTestModel = async (providerModelId: string) => {
    setActionError(null);
    try {
      await testProviderModel.mutateAsync({ modelId: providerModelId });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to test model");
    }
  };

  const handleDeleteModel = async (providerModelId: string) => {
    setActionError(null);
    try {
      await deleteProviderModel.mutateAsync(providerModelId);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to delete model");
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border bg-background p-4">
      <Button
        type="button"
        variant="ghost"
        className="px-0"
        onClick={() => onBackToMarketplace(category)}
      >
        <ArrowLeftIcon />
        {copy.backToMarketplace}
      </Button>

      <div className="space-y-2 rounded-2xl border bg-muted/10 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="text-lg font-semibold">{provider.display_name}</div>
            <p className="text-muted-foreground text-sm">
              {provider.template?.description ?? copy.providerSummary}
            </p>
          </div>
          <Badge variant={providerStatusVariant(provider.provider_test_status)}>
            {statusLabel}
          </Badge>
        </div>
      </div>

      {actionError ? (
        <div className="text-destructive text-sm">{actionError}</div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <ProviderCredentialsForm
          provider={provider}
          onSave={handleSaveProvider}
          onTest={handleTestProvider}
          isSaving={updateProvider.isPending}
          isTesting={testProvider.isPending}
        />

        <ProviderModelList
          provider={provider}
          discoveredModels={discoveredModels}
          isDiscovering={discoverModels.isPending}
          onDiscover={handleDiscoverModels}
          onAddModels={handleAddModels}
          onSetPrimary={handleSetPrimary}
          onTestModel={handleTestModel}
          onDeleteModel={handleDeleteModel}
        />
      </div>
    </div>
  );
}
