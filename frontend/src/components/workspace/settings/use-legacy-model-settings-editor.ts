"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { cloneConfig, type ConfigDraft } from "./configuration/shared";
import {
  loadLegacyModelSettingsDraft,
  saveLegacyModelSettingsDraft,
} from "./model-management/legacy-draft-adapter";

function jsonStable(value: unknown): string {
  return JSON.stringify(value ?? {});
}

type UseLegacyModelSettingsEditorOptions = {
  prepareConfig?: (config: ConfigDraft) => ConfigDraft;
};

export function useLegacyModelSettingsEditor(
  options: UseLegacyModelSettingsEditorOptions = {},
) {
  const { prepareConfig } = options;
  const [initialConfig, setInitialConfig] = useState<ConfigDraft>({});
  const [draftConfig, setDraftConfig] = useState<ConfigDraft>({});
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const loaded = await loadLegacyModelSettingsDraft();
      setInitialConfig(cloneConfig(loaded));
      setDraftConfig(cloneConfig(loaded));
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty = useMemo(
    () => jsonStable(draftConfig) !== jsonStable(initialConfig),
    [draftConfig, initialConfig],
  );

  const onConfigChange = useCallback((next: ConfigDraft) => {
    setDraftConfig(next);
  }, []);

  const onDiscard = useCallback(() => {
    setDraftConfig(cloneConfig(initialConfig));
  }, [initialConfig]);

  const onSave = useCallback(async () => {
    const next = cloneConfig(draftConfig);
    const prepared = prepareConfig ? prepareConfig(next) : next;
    setSaving(true);
    try {
      await saveLegacyModelSettingsDraft(prepared);
      const reloaded = await loadLegacyModelSettingsDraft();
      setInitialConfig(cloneConfig(reloaded));
      setDraftConfig(cloneConfig(reloaded));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      return false;
    } finally {
      setSaving(false);
    }
  }, [draftConfig, prepareConfig]);

  return {
    draftConfig,
    validationErrors: [],
    isLoading,
    error,
    dirty,
    disabled: isLoading || saving,
    saving,
    onConfigChange,
    onDiscard,
    onSave,
  };
}
