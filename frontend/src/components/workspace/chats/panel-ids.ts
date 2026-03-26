export function buildChatPanelIds(pathname: string) {
  const base =
    pathname.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") ||
    "workspace";

  return {
    groupId: `${base}-panels`,
    separatorId: `${base}-separator`,
  };
}
