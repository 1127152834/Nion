import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

export type BridgeBinding = {
  id: string;
  platform: string;
  chatId: string;
  threadId: string;
  workingDirectory: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

type BridgeBindingsDocument = {
  bindings: BridgeBinding[];
};

const DEFAULT_DOCUMENT: BridgeBindingsDocument = {
  bindings: [],
};

export function createBridgeBindingsStore(filePath: string) {
  const resolvedPath = path.resolve(filePath);

  const ensureParent = () => {
    fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
  };

  const readDocument = (): BridgeBindingsDocument => {
    if (!fs.existsSync(resolvedPath)) {
      return { ...DEFAULT_DOCUMENT };
    }

    const raw = fs.readFileSync(resolvedPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<BridgeBindingsDocument>;
    return {
      bindings: Array.isArray(parsed.bindings) ? [...parsed.bindings] : [],
    };
  };

  const writeDocument = (document: BridgeBindingsDocument) => {
    ensureParent();
    fs.writeFileSync(resolvedPath, JSON.stringify(document, null, 2), "utf8");
  };

  const listBindings = (): BridgeBinding[] => readDocument().bindings;

  const upsertBinding = (
    binding: Omit<BridgeBinding, "id" | "createdAt" | "updatedAt">,
  ): BridgeBinding => {
    const document = readDocument();
    const now = new Date().toISOString();
    const existingIndex = document.bindings.findIndex(
      (item) => item.platform === binding.platform && item.chatId === binding.chatId,
    );

    if (existingIndex >= 0) {
      const updated: BridgeBinding = {
        ...document.bindings[existingIndex],
        ...binding,
        updatedAt: now,
      };
      document.bindings[existingIndex] = updated;
      writeDocument(document);
      return updated;
    }

    const created: BridgeBinding = {
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
      ...binding,
    };
    document.bindings.push(created);
    writeDocument(document);
    return created;
  };

  return {
    listBindings,
    upsertBinding,
  };
}
