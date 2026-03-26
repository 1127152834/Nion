import path from "node:path";

const MAX_INPUT_LENGTH = 32_000;
const MAX_PATH_LENGTH = 1_024;

const DANGEROUS_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\x00/, reason: "null byte" },
  { pattern: /\.\.[/\\]/, reason: "path traversal" },
  { pattern: /\$\(/, reason: "command substitution" },
  { pattern: /`[^`]*`/, reason: "backtick command substitution" },
  { pattern: /;\s*(rm|curl|wget|chmod|chown|mv|cp|dd|mkfs|shutdown|reboot)\b/i, reason: "chained dangerous command" },
  { pattern: /\|\s*(bash|sh|zsh|exec)\b/i, reason: "pipe to shell" },
  { pattern: />\s*\//, reason: "redirect to absolute path" },
];

export function validateWorkingDirectory(rawPath: string): string | null {
  if (!rawPath?.trim()) {
    return null;
  }
  const trimmed = rawPath.trim();
  if (!path.isAbsolute(trimmed)) {
    return null;
  }
  if (trimmed.length > MAX_PATH_LENGTH) {
    return null;
  }
  if (/[$`;|&><(){}\x00-\x1f]/.test(trimmed)) {
    return null;
  }
  const segments = trimmed.split(/[/\\]/);
  if (segments.some((segment) => segment === "..")) {
    return null;
  }
  return path.normalize(trimmed);
}

export function isDangerousInput(input: string): { dangerous: boolean; reason?: string } {
  if (!input) {
    return { dangerous: false };
  }
  if (input.length > MAX_INPUT_LENGTH * 2) {
    return { dangerous: true, reason: `excessively long input (${input.length} chars)` };
  }
  for (const { pattern, reason } of DANGEROUS_PATTERNS) {
    if (pattern.test(input)) {
      return { dangerous: true, reason };
    }
  }
  return { dangerous: false };
}

export function sanitizeInput(text: string, maxLength = MAX_INPUT_LENGTH) {
  if (!text) {
    return { text: "", truncated: false };
  }
  let sanitized = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  const truncated = sanitized.length > maxLength;
  if (truncated) {
    sanitized = sanitized.slice(0, maxLength);
  }
  return { text: sanitized, truncated };
}
