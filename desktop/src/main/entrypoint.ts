import fs from "node:fs";
import path from "node:path";

export function shouldAutoStartDesktopMain(
  moduleFilename: string,
  argvEntry = process.argv[1],
): boolean {
  if (!argvEntry) {
    return false;
  }

  return normalizePath(argvEntry) === normalizePath(moduleFilename);
}

function normalizePath(value: string): string {
  const resolved = path.resolve(value);

  try {
    return fs.realpathSync.native(resolved);
  } catch {
    return resolved;
  }
}
