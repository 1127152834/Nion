"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/core/i18n/hooks";

import { MemoryProviderFoundationCard } from "./memory-provider-foundation-card";

export function MemoryProviderPanel(props: {
  disabled: boolean;
  storageMode: "file" | "custom";
  customStorageClass: string;
  customClassPlaceholder: string;
  onStorageModeChange: (value: "file" | "custom") => void;
  onCustomStorageClassChange: (value: string) => void;
}) {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      <MemoryProviderFoundationCard />

      <div className="rounded-xl border bg-background/80 p-5 shadow-sm">
        <div className="space-y-1">
          <h3 className="text-base font-medium">
            {t.settings.memory.storage.title}
          </h3>
          <p className="text-muted-foreground text-sm">
            {t.settings.memory.storage.description}
          </p>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-[220px_1fr]">
          <label className="space-y-1.5">
            <div className="text-xs font-medium">
              {t.settings.memory.storage.modeLabel}
            </div>
            <Select
              value={props.storageMode}
              onValueChange={(value) =>
                props.onStorageModeChange(value as "file" | "custom")
              }
            >
              <SelectTrigger disabled={props.disabled}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="file">
                  {t.settings.memory.storage.fileMode}
                </SelectItem>
                <SelectItem value="custom">
                  {t.settings.memory.storage.customMode}
                </SelectItem>
              </SelectContent>
            </Select>
          </label>

          {props.storageMode === "custom" ? (
            <label className="space-y-1.5">
              <div className="text-xs font-medium">
                {t.settings.memory.storage.customClassLabel}
              </div>
              <Input
                value={props.customStorageClass}
                disabled={props.disabled}
                placeholder={props.customClassPlaceholder}
                onChange={(event) =>
                  props.onCustomStorageClassChange(event.target.value)
                }
              />
            </label>
          ) : null}
        </div>
      </div>
    </div>
  );
}
