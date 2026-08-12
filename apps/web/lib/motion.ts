"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";

gsap.registerPlugin(useGSAP);

export const motionEase = {
  out: "power3.out",
  inOut: "power2.inOut",
  expo: "expo.out",
  snap: "power4.out",
} as const;

export const motionDuration = {
  fast: 0.32,
  base: 0.55,
  slow: 0.85,
} as const;

export function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export { gsap, useGSAP };
