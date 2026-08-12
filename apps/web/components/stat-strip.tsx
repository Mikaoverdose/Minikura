"use client";

import type { LucideIcon } from "lucide-react";
import { useRef } from "react";
import { cn } from "@/lib/cn";
import { gsap, motionEase, prefersReducedMotion, useGSAP } from "@/lib/motion";

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
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = ref.current;
      if (!root) return;
      const cells = root.querySelectorAll("[data-stat-cell]");
      if (prefersReducedMotion()) {
        gsap.set(cells, { autoAlpha: 1, y: 0 });
        return;
      }

      gsap.fromTo(
        cells,
        { autoAlpha: 0, y: 12 },
        { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.05, ease: motionEase.out }
      );

      for (const valueEl of root.querySelectorAll<HTMLElement>("[data-stat-value]")) {
        const raw = valueEl.dataset.statValue;
        const numeric = raw !== undefined ? Number(raw) : Number.NaN;
        if (!Number.isFinite(numeric)) continue;
        const state = { value: 0 };
        gsap.to(state, {
          value: numeric,
          duration: 0.7,
          ease: motionEase.out,
          onUpdate: () => {
            valueEl.textContent = String(Math.round(state.value));
          },
        });
      }
    },
    { scope: ref, dependencies: [items.map((item) => `${item.label}:${item.value}`).join("|")] }
  );

  return (
    <div
      ref={ref}
      className={cn(
        "grid divide-x divide-border border bg-card shadow-[2px_2px_0_color-mix(in_oklch,var(--foreground)_8%,transparent)]",
        className
      )}
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map(({ label, value, icon: Icon, tone = "default" }) => (
        <div key={label} data-stat-cell="" className="min-w-20 px-3 py-2.5 sm:min-w-28 sm:px-4">
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
          <strong
            data-stat-value={typeof value === "number" ? value : undefined}
            className="block text-xl leading-none tabular-nums sm:text-2xl"
          >
            {value}
          </strong>
        </div>
      ))}
    </div>
  );
}
