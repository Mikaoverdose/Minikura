"use client";

import { useRef } from "react";
import { cn } from "@/lib/cn";
import { gsap, motionDuration, motionEase, prefersReducedMotion, useGSAP } from "@/lib/motion";

type BrandMarkProps = {
  className?: string;
  /**
   * Renders the mark for placement on a filled `primary` panel: the block reads
   * in the panel's foreground colour instead of the brand green.
   */
  inverted?: boolean;
};

/**
 * An isometric block on a 24-unit grid — three faces, no interior detail.
 *
 * The mark ships as small as 32px, so it is drawn with only the silhouette and
 * the three face tones that separate it. Colour comes from `currentColor` plus
 * two `color-mix` shades of it, so the block follows `text-primary` /
 * `text-primary-foreground` and works on the sidebar, the light dashboard, and
 * the filled primary panel from a single asset.
 */
function BrandGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      {/* Left face — mixed toward black for the shadowed side. */}
      <path
        d="M2.5 7 12 12.2 12 22.4 2.5 17.2Z"
        fill="color-mix(in oklch, currentColor 62%, black)"
      />
      {/* Right face — the mid tone. */}
      <path
        d="M21.5 7 12 12.2 12 22.4 21.5 17.2Z"
        fill="color-mix(in oklch, currentColor 80%, black)"
      />
      {/* Top face — full strength, so the mark keys off `currentColor` exactly. */}
      <path d="M12 1.6 21.5 7 12 12.2 2.5 7Z" fill="currentColor" />
    </svg>
  );
}

export function BrandMark({ className, inverted }: BrandMarkProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || prefersReducedMotion()) return;

      const enter = () =>
        gsap.to(el, { y: -2, duration: motionDuration.fast, ease: motionEase.out });
      const leave = () =>
        gsap.to(el, { y: 0, duration: motionDuration.fast, ease: motionEase.out });

      el.addEventListener("pointerenter", enter);
      el.addEventListener("pointerleave", leave);
      return () => {
        el.removeEventListener("pointerenter", enter);
        el.removeEventListener("pointerleave", leave);
      };
    },
    { scope: ref }
  );

  return (
    <div
      ref={ref}
      className={cn(
        "relative grid size-11 shrink-0 place-items-center will-change-transform",
        inverted ? "text-primary-foreground" : "text-primary",
        className
      )}
      aria-hidden="true"
    >
      <BrandGlyph className="size-full" />
    </div>
  );
}

type BrandLockupProps = BrandMarkProps & {
  subtitle: string;
  compact?: boolean;
  textClassName?: string;
};

export function BrandLockup({
  subtitle,
  compact,
  className,
  textClassName,
  inverted,
}: BrandLockupProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <BrandMark className={compact ? "size-9" : undefined} inverted={inverted} />
      <div className={textClassName}>
        <p
          className={cn(
            "font-black uppercase tracking-[0.14em]",
            compact ? "text-base" : "text-lg"
          )}
        >
          Minikura
        </p>
        <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-current/45">
          {subtitle}
        </p>
      </div>
    </div>
  );
}
