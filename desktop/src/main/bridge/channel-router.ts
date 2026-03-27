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
    return {
      workingDirectory: options.defaultWorkingDirectory?.() ?? "",
      model: "",
      mode: "code" as const,
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
