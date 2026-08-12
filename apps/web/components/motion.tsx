"use client";

import type { ComponentProps, ReactNode } from "react";
import { useRef } from "react";
import { cn } from "@/lib/cn";
import { gsap, motionDuration, motionEase, prefersReducedMotion, useGSAP } from "@/lib/motion";

type FadeInProps = ComponentProps<"div"> & {
  delay?: number;
  duration?: number;
  y?: number;
  x?: number;
};

export function FadeIn({
  children,
  className,
  delay = 0,
  duration = motionDuration.base,
  y = 16,
  x = 0,
  ...props
}: FadeInProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      if (prefersReducedMotion()) {
        gsap.set(el, { autoAlpha: 1, x: 0, y: 0 });
        return;
      }
      gsap.fromTo(
        el,
        { autoAlpha: 0, x, y },
        { autoAlpha: 1, x: 0, y: 0, delay, duration, ease: motionEase.out }
      );
    },
    { scope: ref }
  );

  return (
    <div ref={ref} className={className} {...props}>
      {children}
    </div>
  );
}

type StaggerProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  stagger?: number;
  duration?: number;
  y?: number;
  selector?: string;
};

export function Stagger({
  children,
  className,
  delay = 0,
  stagger = 0.06,
  duration = motionDuration.base,
  y = 14,
  selector = ":scope > *",
}: StaggerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = ref.current;
      if (!root) return;
      const items = root.querySelectorAll(selector);
      if (!items.length) return;
      if (prefersReducedMotion()) {
        gsap.set(items, { autoAlpha: 1, y: 0 });
        return;
      }
      gsap.fromTo(
        items,
        { autoAlpha: 0, y },
        { autoAlpha: 1, y: 0, delay, duration, stagger, ease: motionEase.out }
      );
    },
    { scope: ref }
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

type HoverLiftProps = {
  children: ReactNode;
  className?: string;
  y?: number;
};

export function HoverLift({ children, className, y = -3 }: HoverLiftProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || prefersReducedMotion()) return;

      const enter = () => gsap.to(el, { y, duration: motionDuration.fast, ease: motionEase.out });
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
    <div ref={ref} className={cn("will-change-transform", className)}>
      {children}
    </div>
  );
}

export function useShake(trigger: string | null | undefined) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || !trigger || prefersReducedMotion()) return;
      gsap.fromTo(el, { x: -6 }, { x: 0, duration: 0.42, ease: "elastic.out(1, 0.4)" });
    },
    { dependencies: [trigger], scope: ref }
  );

  return ref;
}
