"use client";

type DocumentMode = "preview" | "edit";

export function DocumentModeToggle(props: {
  mode: DocumentMode;
  onModeChange: (mode: DocumentMode) => void;
}) {
  return (
    <div className="inline-flex rounded-full border border-border/80 bg-background p-1">
      <button
        type="button"
        className={`rounded-full px-4 py-2 text-sm ${
          props.mode === "preview"
            ? "bg-foreground text-background"
            : "text-muted-foreground"
        }`}
        onClick={() => props.onModeChange("preview")}
      >
        预览
      </button>
      <button
        type="button"
        className={`rounded-full px-4 py-2 text-sm ${
          props.mode === "edit"
            ? "bg-foreground text-background"
            : "text-muted-foreground"
        }`}
        onClick={() => props.onModeChange("edit")}
      >
        编辑
      </button>
    </div>
  );
}
