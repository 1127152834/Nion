export const SETTINGS_SECTIONS = [
  "appearance",
  "models",
  "sessionPolicy",
  "notification",
  "memory",
  "tools",
  "search",
  "mcpServers",
  "skills",
  "sandbox",
  "channels",
] as const;

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

const SETTINGS_SECTION_SET = new Set<string>(SETTINGS_SECTIONS);

export function parseSettingsSection(
  section: string | null,
): SettingsSection | null {
  if (!section) {
    return null;
  }
  return SETTINGS_SECTION_SET.has(section) ? (section as SettingsSection) : null;
}
