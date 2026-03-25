"use client";

import { useEffect, useState } from "react";

import { useI18n } from "@/core/i18n/hooks";
import {
  useCreateProviderInstance,
  useProviderInstances,
} from "@/core/model-admin/hooks";
import type { ProviderCategory, ProviderTemplate } from "@/core/model-admin/types";

import { ProviderDetail } from "./model-management/provider-detail";
import { ProviderInstanceList } from "./model-management/provider-instance-list";
import { ProviderMarketplace } from "./model-management/provider-marketplace";
import type { ModelManagementView } from "./model-management/types";
import { isCustomProviderTemplate } from "./model-management/types";
import { SettingsSection } from "./settings-section";

export function ModelSettingsPage() {
  const { t } = useI18n();
  const pageCopy = t.settings.modelPage;
  const providersQuery = useProviderInstances();
  const createProvider = useCreateProviderInstance();
  const [view, setView] = useState<ModelManagementView>({
    kind: "marketplace",
    category: "domestic",
  });
  const [marketplaceCategory, setMarketplaceCategory] =
    useState<ProviderCategory>("domestic");
  const [actionError, setActionError] = useState<string | null>(null);

  const providers = providersQuery.data ?? [];
  const selectedProvider =
    view.kind === "provider-detail"
      ? providers.find((item) => item.id === view.providerId) ?? null
      : null;

  useEffect(() => {
    if (view.kind === "provider-detail" && !selectedProvider) {
      setView({ kind: "marketplace", category: "domestic" });
    }
  }, [selectedProvider, view]);

  const categoryLabels = pageCopy.categories;
  const statusLabels = pageCopy.statusLabels;

  const handleSelectTemplate = async (template: ProviderTemplate) => {
    setActionError(null);
    if (isCustomProviderTemplate(template)) {
      setView({ kind: "custom-provider-create", category: marketplaceCategory });
      return;
    }

    try {
      const response = await createProvider.mutateAsync({
        provider_template_id: template.id,
      });
      setView({ kind: "provider-detail", providerId: response.provider.id });
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : pageCopy.createFailed,
      );
    }
  };

  const handleCreateCustomProvider = async () => {
    setActionError(null);
    try {
      const response = await createProvider.mutateAsync({
        kind: "custom",
      });
      setView({ kind: "provider-detail", providerId: response.provider.id });
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : pageCopy.createFailed,
      );
    }
  };

  return (
    <SettingsSection
      title={t.settings.models.title}
      description={t.settings.models.description}
    >
      {providersQuery.isLoading ? (
        <div className="text-muted-foreground text-sm">{t.common.loading}</div>
      ) : providersQuery.error ? (
        <div className="text-destructive text-sm">
          {providersQuery.error instanceof Error
            ? providersQuery.error.message
            : pageCopy.loadConfigFailed}
        </div>
      ) : (
        <div className="space-y-4">
          {actionError ? (
            <div className="text-destructive rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm">
              {actionError}
            </div>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
            <ProviderInstanceList
              providers={providers}
              selectedProviderId={selectedProvider?.id}
              onSelectProvider={(providerId) =>
                setView({ kind: "provider-detail", providerId })
              }
              onAddProvider={() =>
                setView({ kind: "marketplace", category: marketplaceCategory })
              }
              title={pageCopy.providerListTitle}
              description={pageCopy.providerListDescription}
              addLabel={pageCopy.addProvider}
              emptyTitle={pageCopy.emptyProvidersTitle}
              emptyDescription={pageCopy.emptyProvidersDescription}
              statusLabels={statusLabels}
            />

            {view.kind === "marketplace" ? (
              <ProviderMarketplace
                category={view.category}
                providers={providers}
                onCategoryChange={(category) => {
                  setMarketplaceCategory(category);
                  setView({ kind: "marketplace", category });
                }}
                onSelectTemplate={handleSelectTemplate}
                categoryLabels={categoryLabels}
                title={pageCopy.marketplaceTitle}
                description={pageCopy.marketplaceDescription}
                emptyTitle={pageCopy.emptyMarketplaceTitle}
                emptyDescription={pageCopy.emptyMarketplaceDescription}
                addLabel={pageCopy.addProviderCta}
                alreadyAddedLabel={pageCopy.alreadyAdded}
                globalNoticeLabel={pageCopy.globalNoticeLabel}
              />
            ) : (
              <ProviderDetail
                provider={selectedProvider}
                category={
                  view.kind === "custom-provider-create"
                    ? view.category
                    : marketplaceCategory
                }
                customCreateMode={view.kind === "custom-provider-create"}
                onBackToMarketplace={(category) =>
                  setView({ kind: "marketplace", category })
                }
                onCreateCustomProvider={handleCreateCustomProvider}
                copy={{
                  backToMarketplace: pageCopy.providerDetail.backToMarketplace,
                  providerSummary: pageCopy.providerDetail.providerSummary,
                  credentialsTitle: pageCopy.providerDetail.credentialsTitle,
                  credentialsDescription:
                    pageCopy.providerDetail.credentialsDescription,
                  modelsTitle: pageCopy.providerDetail.modelsTitle,
                  modelsDescription: pageCopy.providerDetail.modelsDescription,
                  emptyModelsTitle: pageCopy.providerDetail.emptyModelsTitle,
                  emptyModelsDescription:
                    pageCopy.providerDetail.emptyModelsDescription,
                  customCreateTitle:
                    pageCopy.providerDetail.customCreateTitle,
                  customCreateDescription:
                    pageCopy.providerDetail.customCreateDescription,
                  customCreateAction:
                    pageCopy.providerDetail.customCreateAction,
                  untested: statusLabels.untested,
                  success: statusLabels.success,
                  failed: statusLabels.failed,
                }}
              />
            )}
          </div>
        </div>
      )}
    </SettingsSection>
  );
}
