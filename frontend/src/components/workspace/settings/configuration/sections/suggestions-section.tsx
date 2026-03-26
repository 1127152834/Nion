"use client";

import { useMemo } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/core/i18n/hooks";
import { useModels } from "@/core/models/hooks";

import {
  asObject,
  asString,
  cloneConfig,
  type ConfigDraft,
} from "../shared";
import {
  DEFAULT_POLICY_MODEL_VALUE,
  getPolicyModelSelectValue,
} from "../../session-policy-model-selection";

export function SuggestionsSection({
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
      suggestions?: Record<string, string>;
    };
  };
  const copy = settingsLike.configSections?.suggestions ?? {};
  const suggestions = asObject(config.suggestions);
  const selectedModel = asString(suggestions.model_name).trim();
  const { models } = useModels();

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

  const selectedLabel = useMemo(() => {
    if (selectedValue === DEFAULT_POLICY_MODEL_VALUE) {
      return copy.useDefaultModel ?? "Use default model";
    }
    const matched = modelOptions.find((item) => item.name === selectedValue);
    return matched?.label ?? selectedValue;
  }, [copy.useDefaultModel, modelOptions, selectedValue]);

  const updateSuggestionsModel = (value: string) => {
    const next = cloneConfig(config);
    const target = asObject(next.suggestions);
    if (value === DEFAULT_POLICY_MODEL_VALUE) {
      delete target.model_name;
    } else {
      target.model_name = value;
    }
    if (Object.keys(target).length === 0) {
      delete next.suggestions;
    } else {
      next.suggestions = target;
    }
    onChange(next);
  };

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="space-y-1">
        <div className="text-sm font-medium">{copy.title}</div>
        <div className="text-muted-foreground text-xs">{copy.subtitle}</div>
      </div>

      <div className="space-y-1.5">
        <div className="text-xs font-medium">{copy.model}</div>
        <Select value={selectedValue} onValueChange={updateSuggestionsModel}>
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

      <div className="text-muted-foreground text-xs">
        {(copy.current ?? "Current: {model}").replace("{model}", selectedLabel)}
      </div>
    </div>
  );
}
