export const FILE_MEMORY_STORAGE_CLASS =
  "nion.agents.memory.storage.FileMemoryStorage";

export type MemoryStorageMode = "file" | "custom";

export function inferMemoryStorageMode(
  storageClass: string,
): MemoryStorageMode {
  return storageClass === FILE_MEMORY_STORAGE_CLASS ? "file" : "custom";
}

export function resolveMemoryStorageModeSelection(
  nextMode: MemoryStorageMode,
  storedClass: string,
  customDraft: string,
): {
  nextStoredClass: string;
  nextModeOverride: MemoryStorageMode | null;
  nextCustomDraft: string;
} {
  if (nextMode === "file") {
    return {
      nextStoredClass: FILE_MEMORY_STORAGE_CLASS,
      nextModeOverride: null,
      nextCustomDraft: "",
    };
  }

  const nextCustomDraft =
    customDraft || (storedClass === FILE_MEMORY_STORAGE_CLASS ? storedClass : storedClass);

  return {
    nextStoredClass: storedClass,
    nextModeOverride: "custom",
    nextCustomDraft,
  };
}
