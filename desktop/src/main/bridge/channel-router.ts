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
  defaultWorkingDirectory: () => string;
}) {
  const resolveBinding = (address: BridgeAddress): BridgeBinding => {
    const existing = options
      .listBindings()
      .find(
        ({ platform, chatId }) =>
          platform === address.platform && chatId === address.chatId,
      );

    if (existing) {
      return existing;
    }

    return options.upsertBinding({
      platform: address.platform,
      chatId: address.chatId,
      threadId: `bridge-${randomUUID()}`,
      workingDirectory: options.defaultWorkingDirectory(),
      active: true,
    });
  };

  return {
    resolveBinding,
  };
}
