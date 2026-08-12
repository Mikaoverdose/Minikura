import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export type StatItem = {
  label: string;
  value: number | string;
  icon?: LucideIcon;
  tone?: "default" | "positive" | "warning";
};

export function StatStrip({
  items,
  className,
}: {
  items: readonly StatItem[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid divide-x divide-border border bg-card shadow-[2px_2px_0_color-mix(in_oklch,var(--foreground)_8%,transparent)]",
        className
      )}
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map(({ label, value, icon: Icon, tone = "default" }) => (
        <div key={label} className="min-w-20 px-3 py-2.5 sm:min-w-28 sm:px-4">
          <div className="mb-1.5 flex items-center gap-1.5 text-muted-foreground">
            {Icon && (
              <Icon
                className={cn(
                  "size-3.5",
                  tone === "positive" && "text-success",
                  tone === "warning" && "text-warning"
                )}
              />
            )}
            <span className="truncate font-mono text-[9px] font-bold uppercase tracking-[0.12em]">
              {label}
            </span>
          </div>
          <strong className="block text-xl leading-none tabular-nums sm:text-2xl">{value}</strong>
        </div>
      ))}
    </div>
  );
}
