import fs from "node:fs";
import path from "node:path";

type BridgeOffsetDocument = {
  offsets: Record<string, string>;
};

const DEFAULT_DOCUMENT: BridgeOffsetDocument = {
  offsets: {},
};

export function createBridgeOffsetStore(filePath: string) {
  const resolvedPath = path.resolve(filePath);

  const ensureParent = () => {
    fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
  };

  const readDocument = (): BridgeOffsetDocument => {
    if (!fs.existsSync(resolvedPath)) {
      return { ...DEFAULT_DOCUMENT };
    }

    const raw = fs.readFileSync(resolvedPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<BridgeOffsetDocument>;
    return {
      offsets:
        parsed.offsets && typeof parsed.offsets === "object"
          ? { ...parsed.offsets }
          : {},
    };
  };

  const writeDocument = (document: BridgeOffsetDocument) => {
    ensureParent();
    fs.writeFileSync(resolvedPath, JSON.stringify(document, null, 2), "utf8");
  };

  const getOffset = (key: string) => readDocument().offsets[key] ?? "";

  const setOffset = (key: string, value: string) => {
    const document = readDocument();
    document.offsets[key] = value;
    writeDocument(document);
  };

  return {
    getOffset,
    setOffset,
  };
}
