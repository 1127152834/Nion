import fs from "node:fs";
import path from "node:path";

export type BridgeSettingsDocument = {
  settings: Record<string, string>;
  updatedAt: string;
};

const DEFAULT_DOCUMENT: BridgeSettingsDocument = {
  settings: {},
  updatedAt: "",
};

export function createBridgeSettingsStore(filePath: string) {
  const resolvedPath = path.resolve(filePath);

  const ensureParent = () => {
    fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
  };

  const loadSettings = (): BridgeSettingsDocument => {
    if (!fs.existsSync(resolvedPath)) {
      return { ...DEFAULT_DOCUMENT };
    }

    const raw = fs.readFileSync(resolvedPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<BridgeSettingsDocument>;
    return {
      settings:
        parsed.settings && typeof parsed.settings === "object"
          ? { ...parsed.settings }
          : {},
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : "",
    };
  };

  const saveSettings = (settings: Record<string, string>): BridgeSettingsDocument => {
    ensureParent();
    const document: BridgeSettingsDocument = {
      settings: { ...settings },
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(resolvedPath, JSON.stringify(document, null, 2), "utf8");
    return document;
  };

  return {
    loadSettings,
    saveSettings,
  };
}
