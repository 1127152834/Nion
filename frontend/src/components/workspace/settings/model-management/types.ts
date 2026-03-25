import type {
  ProviderCategory,
  ProviderInstanceRecord,
  ProviderModelRecord,
  ProviderTemplate,
} from "@/core/model-admin/types";

export type ModelManagementView =
  | { kind: "marketplace"; category: ProviderCategory }
  | { kind: "provider-detail"; providerId: string }
  | { kind: "custom-provider-create"; category: ProviderCategory };

export const MODEL_MANAGEMENT_CATEGORIES: ProviderCategory[] = [
  "domestic",
  "aggregator",
  "global",
  "local",
];

export function getProviderPrimaryModel(
  provider: ProviderInstanceRecord,
): ProviderModelRecord | undefined {
  return (
    provider.models.find((item) => item.id === provider.primary_model_id) ??
    provider.models.find((item) => item.is_primary) ??
    provider.models[0]
  );
}

export function isCustomProviderTemplate(template: ProviderTemplate): boolean {
  return template.code === "custom-provider" || template.protocol === "custom";
}
