"use client";

import { useRef } from "react";
import type * as React from "react";
import { FadeIn } from "@/components/motion";
import { BrandMark } from "@/components/brand";
import { cn } from "@/lib/cn";
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/motion";

type PageHeaderProps = {
  eyebrow: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  leading?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
};

export function PageShell({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("page-shell", className)} {...props} />;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  leading,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <FadeIn y={12} duration={0.45}>
      <header className={cn("page-heading", className)}>
        <div className={cn(leading && "flex items-center gap-4")}>
          {leading}
          <div>
            <span className="page-eyebrow">{eyebrow}</span>
            <h1 className="page-title">{title}</h1>
            {description && <p className="page-description">{description}</p>}
          </div>
        </div>
        {actions}
      </header>
    </FadeIn>
  );
}

type StatePanelProps = React.ComponentProps<"div"> & {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  tone?: "default" | "error";
  loading?: boolean;
};

export function StatePanel({
  title,
  description,
  icon,
  action,
  tone = "default",
  loading = false,
  className,
  ...props
}: StatePanelProps) {
  return (
    <FadeIn
      y={10}
      duration={0.4}
      className={cn(
        "flex min-h-48 items-center justify-center border border-dashed bg-card/60 p-6 text-center",
        className
      )}
      {...props}
    >
      <div className="flex max-w-lg flex-col items-center gap-2">
        {loading ? (
          <LoaderMark className="mb-2" />
        ) : (
          icon && <div className="mb-2 text-muted-foreground">{icon}</div>
        )}
        <p className={cn("font-bold", tone === "error" && "text-destructive")}>{title}</p>
        {description && <div className="text-sm text-muted-foreground">{description}</div>}
        {action && <div className="mt-3">{action}</div>}
      </div>
    </FadeIn>
  );
}

function LoaderMark({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || prefersReducedMotion()) return;
      gsap.to(el, {
        rotate: 180,
        duration: 1.1,
        repeat: -1,
        yoyo: true,
        ease: "power1.inOut",
      });
    },
    { scope: ref }
  );

  return (
    <div ref={ref} className={cn("text-muted-foreground", className)}>
      <BrandMark className="size-8 text-sm" />
    </div>
  );
}

export function FullScreenLoader({ label }: { label?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root || prefersReducedMotion()) return;
      const mark = root.querySelector("[data-loader-mark]");
      const ring = root.querySelector("[data-loader-ring]");
      const copy = root.querySelector("[data-loader-copy]");

      gsap.fromTo(
        [mark, copy],
        { autoAlpha: 0, y: 8 },
        { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.08, ease: "power3.out" }
      );
      gsap.to(mark, {
        scale: 1.06,
        duration: 0.9,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
      gsap.to(ring, {
        rotate: 360,
        duration: 2.4,
        repeat: -1,
        ease: "none",
      });
    },
    { scope: rootRef }
  );

  return (
    <div
      ref={rootRef}
      className="flex min-h-screen flex-col items-center justify-center gap-4 bg-sidebar text-sidebar-foreground"
    >
      <div className="relative grid size-16 place-items-center">
        <span
          data-loader-ring=""
          className="absolute inset-0 border border-sidebar-primary/35 border-t-sidebar-primary"
        />
        <div data-loader-mark="">
          <BrandMark className="size-11" />
        </div>
      </div>
      {label && (
        <span
          data-loader-copy=""
          className="font-mono text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/50"
        >
          {label}
        </span>
      )}
    </div>
  );
}
