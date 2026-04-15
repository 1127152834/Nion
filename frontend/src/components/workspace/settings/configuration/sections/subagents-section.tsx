"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSessionPolicyOptions } from "@/core/config-center";
import { useI18n } from "@/core/i18n/hooks";

import {
  asObject,
  cloneConfig,
  type ConfigDraft,
  toInputValue,
} from "../shared";

type SubagentEntry = {
  name: string;
  timeout: string;
  available: boolean;
};

function parsePositiveInt(value: string): number | undefined {
  if (!value.trim()) {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return undefined;
  }
  return Math.trunc(parsed);
}

export function SubagentsSection({
  config,
  onChange,
  disabled,
}: {
  config: ConfigDraft;
  onChange: (next: ConfigDraft) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const settingsLike = t.settings as {
    configSections?: {
      subagents?: Record<string, string>;
    };
  };
  const copy = settingsLike.configSections?.subagents ?? {};
  const {
    data: sessionPolicyOptions,
    isLoading: optionsLoading,
    error: optionsError,
  } = useSessionPolicyOptions();
  const subagentOptions = sessionPolicyOptions?.subagents ?? [];
  const visibleNames = subagentOptions.map((item) => item.name);
  const visibleNameSet = new Set(visibleNames);

  const subagents = asObject(config.subagents);
  const agents = asObject(subagents.agents);
  const entries: SubagentEntry[] = Object.entries(agents).map(
    ([name, value]) => {
      const item = asObject(value);
      return {
        name,
        timeout: toInputValue(item.timeout_seconds),
        available: visibleNameSet.has(name),
      };
    },
  );
  const usedNames = new Set(entries.map((entry) => entry.name));
  const availableToAdd = visibleNames.filter((name) => !usedNames.has(name));

  const updateSubagents = (nextSubagents: Record<string, unknown>) => {
    const next = cloneConfig(config);
    if (Object.keys(nextSubagents).length === 0) {
      delete next.subagents;
    } else {
      next.subagents = nextSubagents;
    }
    onChange(next);
  };

  const updateDefaultTimeout = (raw: string) => {
    const nextSubagents = asObject(config.subagents);
    const parsed = parsePositiveInt(raw);
    if (parsed === undefined) {
      delete nextSubagents.timeout_seconds;
    } else {
      nextSubagents.timeout_seconds = parsed;
    }
    updateSubagents(nextSubagents);
  };

  const persistEntries = (nextEntries: Array<{ name: string; timeout: string }>) => {
    const normalizedAgents: Record<string, { timeout_seconds: number }> = {};
    for (const entry of nextEntries) {
      const name = entry.name.trim();
      const timeout = parsePositiveInt(entry.timeout);
      if (!name || timeout === undefined) {
        continue;
      }
      normalizedAgents[name] = { timeout_seconds: timeout };
    }

    const nextSubagents = asObject(config.subagents);
    if (Object.keys(normalizedAgents).length === 0) {
      delete nextSubagents.agents;
    } else {
      nextSubagents.agents = normalizedAgents;
    }
    updateSubagents(nextSubagents);
  };

  const updateEntryName = (index: number, nextName: string) => {
    persistEntries(
      entries.map((entry, idx) =>
        idx === index
          ? { name: nextName, timeout: entry.timeout }
          : { name: entry.name, timeout: entry.timeout },
      ),
    );
  };

  const updateEntryTimeout = (index: number, nextTimeout: string) => {
    persistEntries(
      entries.map((entry, idx) =>
        idx === index
          ? { name: entry.name, timeout: nextTimeout }
          : { name: entry.name, timeout: entry.timeout },
      ),
    );
  };

  const removeEntry = (index: number) => {
    persistEntries(
      entries
        .filter((_, idx) => idx !== index)
        .map((entry) => ({ name: entry.name, timeout: entry.timeout })),
    );
  };

  const addEntry = () => {
    const name = availableToAdd[0];
    if (!name) {
      return;
    }
    persistEntries([
      ...entries.map((entry) => ({ name: entry.name, timeout: entry.timeout })),
      [name, "900"],
    ]);
  };

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="space-y-1">
        <div className="text-sm font-medium">{copy.title}</div>
        <div className="text-muted-foreground text-xs">{copy.subtitle}</div>
      </div>

      <div className="space-y-1.5">
        <div className="text-xs font-medium">{copy.defaultTimeout}</div>
        <Input
          type="number"
          min={1}
          placeholder="900"
          value={toInputValue(subagents.timeout_seconds)}
          onChange={(event) => updateDefaultTimeout(event.target.value)}
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-medium">{copy.perAgent}</div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={addEntry}
            disabled={disabled || optionsLoading || availableToAdd.length === 0}
          >
            <PlusIcon className="size-4" />
            {copy.add}
          </Button>
        </div>
        {optionsError ? (
          <div className="text-destructive text-xs">
            {copy.optionsLoadError}
          </div>
        ) : null}

        {entries.length === 0 ? (
          <div className="text-muted-foreground rounded-md border border-dashed px-3 py-4 text-sm">
            {copy.empty}
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map(({ name, timeout, available }, index) => {
              const selectOptions = available
                ? subagentOptions
                : [
                    ...subagentOptions,
                    {
                      name,
                      description: copy.unavailableSubagent ?? "Unavailable",
                      timeout_seconds: 0,
                    },
                  ];
              return (
                <div
                  key={`${name}-${index}`}
                  className="grid gap-2 md:grid-cols-[minmax(0,240px)_minmax(0,1fr)_auto]"
                >
                  <Select
                    value={name}
                    disabled={disabled}
                    onValueChange={(value) => updateEntryName(index, value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {selectOptions.map((option) => {
                        const optionUsed =
                          option.name !== name && usedNames.has(option.name);
                        const optionAvailable = visibleNameSet.has(option.name);
                        return (
                          <SelectItem
                            key={option.name}
                            value={option.name}
                            disabled={optionUsed}
                          >
                            {option.name}
                            {!optionAvailable
                              ? ` (${copy.unavailableSubagent})`
                              : ""}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min={1}
                    value={timeout}
                    placeholder="900"
                    onChange={(event) =>
                      updateEntryTimeout(index, event.target.value)
                    }
                    disabled={disabled}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeEntry(index)}
                    disabled={disabled}
                    aria-label={copy.remove}
                  >
                    <Trash2Icon className="size-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="text-muted-foreground text-xs">{copy.hint}</div>
    </div>
  );
}
