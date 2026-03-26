export function buildQuickCaptureDraft(raw: string) {
  const cleaned = raw.trim();
  const firstLine = cleaned.split("\n").find((line) => line.trim().length > 0) ?? "";

  return {
    title: (firstLine || "Quick capture").slice(0, 80),
    body: cleaned,
    directory: "inbox",
  };
}
