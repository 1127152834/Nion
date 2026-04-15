"use client";

import { ChevronDownIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/core/i18n/hooks";
import { useModels } from "@/core/models/hooks";
import { cn } from "@/lib/utils";

import {
  DEFAULT_POLICY_MODEL_VALUE,
  getPolicyModelSelectValue,
} from "../../session-policy-model-selection";
import {
  asBoolean,
  asObject,
  asString,
  cloneConfig,
  type ConfigDraft,
  toInputValue,
} from "../shared";

type ContextSizeType = "tokens" | "messages" | "fraction";
const DEFAULT_SUMMARIZATION_TOKEN_LIMIT = 20480;

function normalizeTriggerList(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.map((item) => asObject(item));
  }
  if (value && typeof value === "object") {
    return [asObject(value)];
  }
  return [];
}

function parseContextValue(raw: string, type: ContextSizeType): number | undefined {
  if (!raw.trim()) {
    return undefined;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }
  if (type === "fraction") {
    return parsed;
  }
  return Math.trunc(parsed);
}

export function SummarizationSection({
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
      summarization?: Record<string, string>;
    };
  };
  const copy =
    (settingsLike.configSections?.summarization ?? {}) as Record<
      string,
      string | undefined
    >;
  const summarization = asObject(config.summarization);
  const triggerList = normalizeTriggerList(summarization.trigger);
  const keep = asObject(summarization.keep);
  const keepType = (asString(keep.type) || "messages") as ContextSizeType;
  const selectedModel = asString(summarization.model_name).trim();
  const { models } = useModels();
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const modelOptions = useMemo(
    () =>
      models
        .map((item) => ({
          name: item.name.trim(),
          label: (() => {
            const displayName = item.display_name?.trim();
            return displayName && displayName.length > 0
              ? displayName
              : item.name.trim();
          })(),
        }))
        .filter((item) => item.name.length > 0),
    [models],
  );
  const availableModelNames = modelOptions.map((item) => item.name);
  const selectedValue = getPolicyModelSelectValue(
    selectedModel,
    availableModelNames,
  );

  const triggerTypeLabel: Record<ContextSizeType, string> = {
    tokens: copy.tokensLabel ?? "Tokens",
    messages: copy.messagesLabel ?? "Messages",
    fraction: copy.fractionLabel ?? "Fraction",
  };

  const updateSummarization = (key: string, value: unknown) => {
    const next = cloneConfig(config);
    const target = asObject(next.summarization);
    if (value === undefined || value === null || value === "") {
      delete target[key];
    } else {
      target[key] = value;
    }
    if (Object.keys(target).length === 0) {
      delete next.summarization;
    } else {
      next.summarization = target;
    }
    onChange(next);
  };

  const updateTrigger = (index: number, key: string, value: unknown) => {
    const next = cloneConfig(config);
    const target = asObject(next.summarization);
    const list = normalizeTriggerList(target.trigger);
    const current = list[index] ?? {};
    const nextTrigger = { ...current };
    if (value === undefined || value === "") {
      delete nextTrigger[key];
    } else {
      nextTrigger[key] = value;
    }
    list[index] = nextTrigger;
    target.trigger = list;
    next.summarization = target;
    onChange(next);
  };

  const addTrigger = () => {
    const next = cloneConfig(config);
    const target = asObject(next.summarization);
    const list = normalizeTriggerList(target.trigger);
    list.push({ type: "tokens", value: DEFAULT_SUMMARIZATION_TOKEN_LIMIT });
    target.trigger = list;
    next.summarization = target;
    onChange(next);
  };

  const removeTrigger = (index: number) => {
    const next = cloneConfig(config);
    const target = asObject(next.summarization);
    const list = normalizeTriggerList(target.trigger);
    list.splice(index, 1);
    if (list.length === 0) {
      delete target.trigger;
    } else {
      target.trigger = list;
    }
    next.summarization = target;
    onChange(next);
  };

  const updateKeep = (key: string, value: unknown) => {
    const next = cloneConfig(config);
    const target = asObject(next.summarization);
    const keepObject = asObject(target.keep);
    if (value === undefined || value === null || value === "") {
      delete keepObject[key];
    } else {
      keepObject[key] = value;
    }
    target.keep = keepObject;
    next.summarization = target;
    onChange(next);
  };

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="text-sm font-medium">{copy.title}</div>
          <div className="text-muted-foreground text-xs">{copy.subtitle}</div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={asBoolean(summarization.enabled, false)}
            onCheckedChange={(checked) =>
              updateSummarization("enabled", checked)
            }
            disabled={disabled}
          />
          {copy.enabled}
        </label>
      </div>

      <div className="space-y-1.5">
        <div className="text-xs font-medium">{copy.model}</div>
        <Select
          value={selectedValue}
          onValueChange={(value) =>
            updateSummarization(
              "model_name",
              value === DEFAULT_POLICY_MODEL_VALUE ? "" : value,
            )
          }
        >
          <SelectTrigger disabled={disabled} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={DEFAULT_POLICY_MODEL_VALUE}>
              {copy.useDefaultModel}
            </SelectItem>
            {modelOptions.map((model) => (
              <SelectItem key={model.name} value={model.name}>
                {model.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <section className="space-y-3 rounded-md border p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-medium">{copy.triggers}</div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={addTrigger}
            disabled={disabled}
          >
            <PlusIcon className="size-4" />
            {copy.addTrigger}
          </Button>
        </div>

        {triggerList.length === 0 && (
          <div className="text-muted-foreground text-xs">{copy.noTrigger}</div>
        )}

        {triggerList.map((trigger, index) => {
          const triggerType = (asString(trigger.type) || "tokens") as ContextSizeType;
          return (
            <div
              key={`${triggerType}-${index}`}
              className="grid gap-2 md:grid-cols-[190px_1fr_auto]"
            >
              <div className="space-y-1.5">
                <div className="text-xs font-medium">{copy.triggerType}</div>
                <Select
                  value={triggerType}
                  onValueChange={(value) => updateTrigger(index, "type", value)}
                >
                  <SelectTrigger disabled={disabled} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tokens">
                      {triggerTypeLabel.tokens}
                    </SelectItem>
                    <SelectItem value="messages">
                      {triggerTypeLabel.messages}
                    </SelectItem>
                    <SelectItem value="fraction">
                      {triggerTypeLabel.fraction}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <div className="text-xs font-medium">{copy.triggerValue}</div>
                <Input
                  type="number"
                  step={triggerType === "fraction" ? "0.1" : "1"}
                  placeholder={
                    triggerType === "fraction"
                      ? "0.8"
                      : String(DEFAULT_SUMMARIZATION_TOKEN_LIMIT)
                  }
                  value={toInputValue(trigger.value)}
                  onChange={(event) =>
                    updateTrigger(
                      index,
                      "value",
                      parseContextValue(event.target.value, triggerType),
                    )
                  }
                  disabled={disabled}
                />
              </div>

              <div className="flex items-end">
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => removeTrigger(index)}
                  disabled={disabled}
                  aria-label={copy.remove}
                >
                  <Trash2Icon className="size-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </section>

      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
          >
            <ChevronDownIcon
              className={cn(
                "size-3.5 transition-transform",
                advancedOpen && "rotate-180",
              )}
            />
            {copy.advanced}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <div className="text-xs font-medium">{copy.keepType}</div>
              <Select
                value={keepType}
                onValueChange={(value) => updateKeep("type", value)}
              >
                <SelectTrigger disabled={disabled} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tokens">
                    {triggerTypeLabel.tokens}
                  </SelectItem>
                  <SelectItem value="messages">
                    {triggerTypeLabel.messages}
                  </SelectItem>
                  <SelectItem value="fraction">
                    {triggerTypeLabel.fraction}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <div className="text-xs font-medium">{copy.keepValue}</div>
              <Input
                type="number"
                step={keepType === "fraction" ? "0.1" : "1"}
                placeholder={keepType === "fraction" ? "0.2" : "12"}
                value={toInputValue(keep.value)}
                onChange={(event) =>
                  updateKeep(
                    "value",
                    parseContextValue(event.target.value, keepType),
                  )
                }
                disabled={disabled}
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
