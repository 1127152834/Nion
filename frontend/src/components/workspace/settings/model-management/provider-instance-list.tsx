"use client";

import { CirclePlusIcon, PlugZapIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import type { ProviderInstanceRecord } from "@/core/model-admin/types";
import { cn } from "@/lib/utils";

import { getProviderPrimaryModel } from "./types";

function providerStatusVariant(status: ProviderInstanceRecord["provider_test_status"]) {
  if (status === "success") {
    return "default";
  }
  if (status === "failed") {
    return "destructive";
  }
  return "secondary";
}

export function ProviderInstanceList({
  providers,
  selectedProviderId,
  onSelectProvider,
  onAddProvider,
  title,
  description,
  addLabel,
  emptyTitle,
  emptyDescription,
  statusLabels,
}: {
  providers: ProviderInstanceRecord[];
  selectedProviderId?: string | null;
  onSelectProvider: (providerId: string) => void;
  onAddProvider: () => void;
  title: string;
  description: string;
  addLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  statusLabels: Record<ProviderInstanceRecord["provider_test_status"], string>;
}) {
  return (
    <div className="flex min-h-[540px] flex-col rounded-2xl border bg-muted/10">
      <div className="space-y-1 border-b px-4 py-4">
        <div className="text-sm font-semibold">{title}</div>
        <p className="text-muted-foreground text-xs leading-relaxed">
          {description}
        </p>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {providers.length > 0 ? (
          providers.map((provider) => {
            const primaryModel = getProviderPrimaryModel(provider);
            const isActive = provider.id === selectedProviderId;
            return (
              <button
                key={provider.id}
                type="button"
                onClick={() => onSelectProvider(provider.id)}
                className={cn(
                  "w-full rounded-xl border px-3 py-3 text-left transition-colors",
                  "bg-background/80 hover:bg-background",
                  isActive ? "border-primary shadow-sm" : "border-transparent",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="truncate text-sm font-semibold">
                      {provider.display_name}
                    </div>
                    <div className="text-muted-foreground truncate text-xs">
                      {primaryModel?.display_name ?? primaryModel?.model_id ?? "No model yet"}
                    </div>
                  </div>
                  <Badge variant={providerStatusVariant(provider.provider_test_status)}>
                    {statusLabels[provider.provider_test_status]}
                  </Badge>
                </div>
              </button>
            );
          })
        ) : (
          <Empty className="min-h-[240px] border border-dashed bg-background/40">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <PlugZapIcon />
              </EmptyMedia>
              <EmptyTitle>{emptyTitle}</EmptyTitle>
              <EmptyDescription>{emptyDescription}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </div>

      <div className="border-t p-3">
        <Button type="button" variant="outline" className="w-full" onClick={onAddProvider}>
          <CirclePlusIcon />
          {addLabel}
        </Button>
      </div>
    </div>
  );
}
