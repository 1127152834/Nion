"use client";

import type { CSSProperties } from "react";

export const notebookThemeStyle = {
  "--notebook-shell": "var(--background)",
  "--notebook-sidebar": "var(--sidebar)",
  "--notebook-panel": "var(--card)",
  "--notebook-muted": "var(--muted)",
  "--notebook-hover": "var(--accent)",
  "--notebook-active": "var(--secondary)",
  "--notebook-border": "var(--border)",
  "--notebook-ink": "var(--foreground)",
  "--notebook-soft-text": "var(--muted-foreground)",
  "--notebook-brand": "var(--foreground)",
  "--notebook-success": "#52c41a",
  "--notebook-danger": "#cf1322",
  "--notebook-danger-surface": "#fff1f0",
  "--notebook-warning": "#d48806",
  "--notebook-warning-surface": "#fffbe6",
} as CSSProperties;
