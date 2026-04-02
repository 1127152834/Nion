import { cn } from "@/lib/utils";

export function SettingsSection({
  className,
  title,
  description,
  children,
}: {
  className?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  const hasHeader = title != null || description != null;

  return (
    <section className={cn(className)}>
      {hasHeader ? (
        <header className="space-y-2">
          {title != null ? <div className="text-lg font-semibold">{title}</div> : null}
          {description && (
            <div className="text-muted-foreground text-sm">{description}</div>
          )}
        </header>
      ) : null}
      <main className={hasHeader ? "mt-4" : undefined}>{children}</main>
    </section>
  );
}
