import fs from "node:fs";
import path from "node:path";

export function shouldAutoStartDesktopMain(
  moduleFilename: string,
  argvEntries: string | string[] = process.argv.slice(1),
): boolean {
  const entry = resolveEntrypoint(argvEntries);
  if (!entry) {
    return false;
  }

  return normalizePath(entry) === normalizePath(moduleFilename);
}

function normalizePath(value: string): string {
  const resolved = path.resolve(value);

  try {
    return fs.realpathSync.native(resolved);
  } catch {
    return resolved;
  }
}

function resolveEntrypoint(argvEntries: string | string[]): string | null {
  if (typeof argvEntries === "string") {
    return argvEntries || null;
  }

  for (const candidate of argvEntries) {
    if (!candidate || candidate.startsWith("-")) {
      continue;
    }
    return candidate;
  }

  return null;
}
