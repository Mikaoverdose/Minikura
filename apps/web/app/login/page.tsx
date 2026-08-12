"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AuthFormCard, FormError } from "@/components/auth/auth-form-card";
import { BrandLockup, BrandMark } from "@/components/brand";
import { FullScreenLoader } from "@/components/page-layout";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient, signIn, useSession } from "@/lib/auth-client";
import { gsap, motionEase, prefersReducedMotion, useGSAP } from "@/lib/motion";

function LoginHero() {
  const heroRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const root = heroRef.current;
      if (!root || prefersReducedMotion()) return;

      const bg = root.querySelector("[data-hero-bg]");
      const brand = root.querySelector("[data-hero-brand]");
      const chip = root.querySelector("[data-hero-chip]");
      const lines = root.querySelectorAll("[data-hero-line]");
      const copy = root.querySelector("[data-hero-copy]");
      const foot = root.querySelector("[data-hero-foot]");
      const rail = root.querySelector("[data-hero-rail]");

      const tl = gsap.timeline({ defaults: { ease: motionEase.out } });
      tl.from(bg, { scale: 1.12, duration: 1.2, ease: "power2.out" }, 0)
        .from(rail, { scaleY: 0, duration: 0.6, transformOrigin: "top" }, 0.05)
        .from(brand, { y: -12, autoAlpha: 0, duration: 0.45 }, 0.08)
        .from(chip, { y: 14, autoAlpha: 0, duration: 0.4 }, 0.16)
        .from(lines, { yPercent: 110, duration: 0.7, stagger: 0.08, ease: motionEase.snap }, 0.2)
        .from(copy, { y: 14, autoAlpha: 0, duration: 0.45 }, 0.42)
        .from(foot, { autoAlpha: 0, duration: 0.35 }, 0.55);

      gsap.to(bg, {
        scale: 1.06,
        duration: 18,
        ease: "none",
        yoyo: true,
        repeat: -1,
        delay: 1.2,
      });
    },
    { scope: heroRef }
  );

  return (
    <section
      ref={heroRef}
      className="relative flex min-h-[42vh] flex-col justify-between overflow-hidden border-b border-sidebar-border p-6 sm:min-h-[48vh] sm:p-10 lg:min-h-screen lg:border-r lg:border-b-0 xl:p-16"
    >
      <div
        data-hero-bg=""
        className="absolute inset-0 origin-center bg-[url('/background.png')] bg-cover bg-center will-change-transform"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/25" />
      <div className="auth-scanlines pointer-events-none absolute inset-0" />
      <div
        data-hero-rail=""
        className="absolute top-0 bottom-0 left-0 w-1 origin-top bg-sidebar-primary"
      />

      <div data-hero-brand="" className="relative z-10">
        <BrandLockup subtitle="Minecraft control plane" />
      </div>

      <div className="relative z-10 max-w-2xl py-10 lg:py-20">
        <span
          data-hero-chip=""
          className="mb-5 inline-flex items-center gap-2 border border-sidebar-border bg-sidebar-accent px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em]"
        >
          <span className="size-2 bg-sidebar-primary" />
          Minecraft Control Plane
        </span>
        <h1 className="text-4xl font-black uppercase leading-[0.86] tracking-[-0.065em] sm:text-6xl xl:text-8xl">
          <span className="block overflow-hidden">
            <span data-hero-line="" className="block">
              Play more
            </span>
          </span>
          <span className="block overflow-hidden">
            <span data-hero-line="" className="block text-sidebar-primary">
              Operate less
            </span>
          </span>
        </h1>
        <p
          data-hero-copy=""
          className="mt-6 max-w-lg text-sm leading-7 text-sidebar-foreground/55 sm:mt-7 sm:text-base"
        >
          Spin up servers, route players, and run the whole network from one console.
        </p>
      </div>

      <p
        data-hero-foot=""
        className="relative z-10 font-mono text-[9px] uppercase tracking-[0.2em] text-sidebar-foreground/35"
      >
        Built for people who actually run servers
      </p>
    </section>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isPending && session?.user) {
      router.replace("/dashboard");
    }
  }, [session, isPending, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const result = await signIn.email({
        email,
        password,
      });

      if (result.error) {
        setError(result.error.message || "Invalid email or password");
      } else {
        const refreshedSession = await authClient.getSession({
          query: { disableCookieCache: true },
        });

        if (!refreshedSession.data?.user) {
          setError(
            "Signed in, but the session cookie was not accepted. Check the web and API URLs."
          );
          return;
        }

        window.location.assign("/dashboard");
      }
    } catch (_err) {
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  if (isPending || session?.user) return <FullScreenLoader />;

  return (
    <main className="grid min-h-screen bg-sidebar text-sidebar-foreground lg:grid-cols-[1.2fr_0.8fr]">
      <LoginHero />

      <section className="relative flex items-center justify-center bg-background p-5 text-foreground sm:p-10">
        <ThemeToggle className="absolute top-5 right-5 z-10 sm:top-8 sm:right-8" />
        <AuthFormCard
          title="Sign in"
          description="Use your administrator account to access the console."
          leading={<BrandMark className="size-10" />}
          className="border-2 border-foreground shadow-[8px_8px_0_color-mix(in_oklch,var(--foreground)_18%,transparent)]"
          headerClassName="border-b"
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="admin@example.com"
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Enter password"
                required
              />
            </div>
            <FormError message={error} />
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
              {!loading && <ArrowRight className="ml-auto" />}
            </Button>
          </form>
        </AuthFormCard>
      </section>
    </main>
  );
}
