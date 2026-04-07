export const MEMORY_OS_RUNTIME_BACKEND = "memory_os";

export type MemoryStorageMode = "file" | "custom";

export function inferMemoryStorageMode(
  storageClass: string,
): MemoryStorageMode {
  return storageClass === MEMORY_OS_RUNTIME_BACKEND ? "file" : "custom";
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
      nextStoredClass: MEMORY_OS_RUNTIME_BACKEND,
      nextModeOverride: null,
      nextCustomDraft: "",
    };
  }

  const nextCustomDraft =
    customDraft || (storedClass === MEMORY_OS_RUNTIME_BACKEND ? storedClass : storedClass);

  return {
    nextStoredClass: storedClass,
    nextModeOverride: "custom",
    nextCustomDraft,
  };
}
