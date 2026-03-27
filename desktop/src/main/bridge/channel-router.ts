import { randomUUID } from "node:crypto";

import type { BridgeBinding } from "./bindings-store.js";

export type BridgeAddress = {
  platform: string;
  chatId: string;
  userId?: string;
  displayName?: string;
};

export function createBridgeChannelRouter(options: {
  listBindings: () => BridgeBinding[];
  upsertBinding: (
    binding: Omit<BridgeBinding, "id" | "createdAt" | "updatedAt">,
  ) => BridgeBinding;
  loadSettings?: () => Record<string, string>;
  defaultWorkingDirectory?: () => string;
}) {
  const defaultBindingValues = () => {
    const settings = options.loadSettings?.() ?? {};
    const providerId = settings.bridge_default_provider_id ?? "";
    const modelId = settings.bridge_default_model ?? "";
    return {
      workingDirectory:
        settings.bridge_default_work_dir ?? options.defaultWorkingDirectory?.() ?? "",
      model: providerId && modelId ? `${providerId}:${modelId}` : modelId,
      mode: (settings.bridge_default_mode as BridgeBinding["mode"] | undefined) ?? "code",
    };
  };

  const resolveBinding = (address: BridgeAddress): BridgeBinding => {
    const existing = options
      .listBindings()
      .find(
        ({ platform, chatId }) =>
          platform === address.platform && chatId === address.chatId,
      );

    if (existing) {
      if (!existing.model || !existing.mode) {
        const defaults = defaultBindingValues();
        return options.upsertBinding({
          ...existing,
          model: existing.model || defaults.model,
          mode: existing.mode || defaults.mode,
        });
      }
      return existing;
    }

    const defaults = defaultBindingValues();
    return options.upsertBinding({
      platform: address.platform,
      chatId: address.chatId,
      threadId: `bridge-${randomUUID()}`,
      workingDirectory: defaults.workingDirectory,
      model: defaults.model,
      mode: defaults.mode,
      active: true,
    });
  };

  return {
    resolveBinding,
  };
}
