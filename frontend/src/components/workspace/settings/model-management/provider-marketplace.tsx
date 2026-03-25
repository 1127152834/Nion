"use client";

import { GlobeIcon, LockIcon, SparklesIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProviderTemplates } from "@/core/model-admin/hooks";
import type { ProviderCategory, ProviderInstanceRecord, ProviderTemplate } from "@/core/model-admin/types";
import { cn } from "@/lib/utils";

import {
  MODEL_MANAGEMENT_CATEGORIES,
  isCustomProviderTemplate,
} from "./types";

function templateIsActive(
  template: ProviderTemplate,
  providers: ProviderInstanceRecord[],
) {
  return providers.some(
    (provider) =>
      provider.provider_template_id === template.id && provider.status === "active",
  );
}

export function ProviderMarketplace({
  category,
  providers,
  onCategoryChange,
  onSelectTemplate,
  categoryLabels,
  title,
  description,
  emptyTitle,
  emptyDescription,
  addLabel,
  alreadyAddedLabel,
  globalNoticeLabel,
}: {
  category: ProviderCategory;
  providers: ProviderInstanceRecord[];
  onCategoryChange: (category: ProviderCategory) => void;
  onSelectTemplate: (template: ProviderTemplate) => void;
  categoryLabels: Record<ProviderCategory, string>;
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  addLabel: string;
  alreadyAddedLabel: string;
  globalNoticeLabel: string;
}) {
  const templatesQuery = useProviderTemplates(category);
  const templates = templatesQuery.data ?? [];
  const globalNotice = templates.find((item) => item.network_notice)?.network_notice;

  return (
    <div className="space-y-4 rounded-2xl border bg-background p-4">
      <div className="space-y-1">
        <div className="text-base font-semibold">{title}</div>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {description}
        </p>
      </div>

      <Tabs
        value={category}
        onValueChange={(value) => onCategoryChange(value as ProviderCategory)}
      >
        <TabsList variant="line">
          {MODEL_MANAGEMENT_CATEGORIES.map((item) => (
            <TabsTrigger key={item} value={item}>
              {categoryLabels[item]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {category === "global" && globalNotice ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          <GlobeIcon className="mt-0.5 size-4 shrink-0 text-amber-700" />
          <div className="space-y-1">
            <div className="font-medium">{globalNoticeLabel}</div>
            <p className="text-muted-foreground">{globalNotice}</p>
          </div>
        </div>
      ) : null}

      {templates.length > 0 ? (
        <div className="grid gap-3 xl:grid-cols-2">
          {templates.map((template) => {
            const active = templateIsActive(template, providers);
            const disabled = active && !template.allows_multiple_instances;
            const customTemplate = isCustomProviderTemplate(template);
            return (
              <button
                key={template.id}
                type="button"
                disabled={disabled}
                onClick={() => onSelectTemplate(template)}
                className={cn(
                  "rounded-2xl border p-4 text-left transition-colors",
                  "bg-muted/10 hover:bg-muted/20 disabled:cursor-not-allowed disabled:opacity-60",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold">{template.name}</div>
                      {template.badge ? <Badge>{template.badge}</Badge> : null}
                      {disabled ? (
                        <Badge variant="outline">{alreadyAddedLabel}</Badge>
                      ) : null}
                    </div>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {template.description}
                    </p>
                  </div>
                  <div className="rounded-full border bg-background p-2">
                    {customTemplate ? (
                      <SparklesIcon className="size-4" />
                    ) : (
                      <LockIcon className="size-4" />
                    )}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="text-muted-foreground text-xs">
                    {template.supports_model_discovery
                      ? "Discovery available"
                      : "Manual model entry"}
                  </div>
                  <span
                    className={cn(
                      "inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium",
                      disabled
                        ? "bg-secondary text-secondary-foreground border-transparent"
                        : "bg-background",
                    )}
                  >
                    {disabled ? alreadyAddedLabel : addLabel}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <Empty className="border border-dashed bg-muted/10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SparklesIcon />
            </EmptyMedia>
            <EmptyTitle>{emptyTitle}</EmptyTitle>
            <EmptyDescription>{emptyDescription}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  );
}
