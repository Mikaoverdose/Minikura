"use client";

import { ArrowRight, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AuthFormCard, FormError } from "@/components/auth/auth-form-card";
import { BrandMark } from "@/components/brand";
import { FullScreenLoader } from "@/components/page-layout";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api-client";
import { gsap, motionEase, prefersReducedMotion, useGSAP } from "@/lib/motion";

export default function BootstrapPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [error, setError] = useState("");
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const { data } = await api.bootstrap.status.get();

        if (data && !data.needsSetup) {
          router.replace("/login");
        }
      } catch (_err) {
      } finally {
        setCheckingStatus(false);
      }
    };

    checkStatus();
  }, [router]);

  useGSAP(
    () => {
      const root = stageRef.current;
      if (!root || prefersReducedMotion()) return;

      gsap.fromTo(
        root,
        { y: 28, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.65, ease: motionEase.out }
      );

      const panelItems = root.querySelectorAll("[data-boot-item]");
      gsap.fromTo(
        panelItems,
        { y: 16, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.5, stagger: 0.07, delay: 0.12, ease: motionEase.out }
      );
    },
    { scope: stageRef }
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;
    const name = formData.get("name") as string;

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const { data, error: apiError } = await api.bootstrap.setup.post({
        email,
        password,
        name,
      });

      if (apiError) {
        const errorMessage =
          "value" in apiError &&
          typeof apiError.value === "object" &&
          apiError.value &&
          "message" in apiError.value
            ? String(apiError.value.message)
            : "Failed to create admin user";
        setError(errorMessage);
      } else if (data?.success) {
        router.push("/login");
      } else {
        setError("Failed to create admin user");
      }
    } catch (_err) {
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  if (checkingStatus) return <FullScreenLoader label="Checking setup" />;

  return (
    <main className="auth-grid relative flex min-h-screen items-center justify-center bg-sidebar p-5 sm:p-10">
      <ThemeToggle className="absolute top-5 right-5 sm:top-8 sm:right-8" />
      <div
        ref={stageRef}
        className="grid w-full max-w-5xl overflow-hidden border border-sidebar-border bg-background text-foreground shadow-[12px_12px_0_color-mix(in_oklch,var(--sidebar-primary)_18%,transparent)] lg:grid-cols-[0.8fr_1.2fr]"
      >
        <section className="relative flex flex-col justify-between overflow-hidden bg-primary p-8 text-primary-foreground sm:p-10">
          <div className="auth-scanlines pointer-events-none absolute inset-0 opacity-40" />
          <div data-boot-item="">
            <BrandMark inverted />
          </div>
          <div className="my-16" data-boot-item="">
            <span className="page-eyebrow text-primary-foreground/60">System bootstrap / 01</span>
            <h1 className="text-5xl font-black uppercase leading-[0.9] tracking-[-0.055em]">
              Build your command center.
            </h1>
            <p className="mt-5 text-sm leading-6 text-primary-foreground/65">
              The first account controls users, workloads, routing, and cluster visibility.
            </p>
          </div>
          <div className="space-y-3 font-mono text-[10px] font-bold uppercase tracking-[0.12em]">
            <p className="flex items-center gap-2" data-boot-item="">
              <Check className="size-3" /> Admin authority
            </p>
            <p className="flex items-center gap-2" data-boot-item="">
              <Check className="size-3" /> Secure session
            </p>
            <p className="flex items-center gap-2" data-boot-item="">
              <Check className="size-3" /> Ready in one step
            </p>
          </div>
        </section>
        <AuthFormCard
          title="Create Operator"
          description="Initialize Minikura with an administrator identity."
          className="max-w-none rounded-none border-0 bg-card py-8 shadow-none sm:py-10"
          headerClassName="px-7 sm:px-10"
          contentClassName="px-7 sm:px-10"
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" name="name" placeholder="John Doe" required autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="admin@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Minimum 8 characters"
                minLength={8}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Repeat password"
                minLength={8}
                required
              />
            </div>
            <FormError message={error} />
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? "Initializing..." : "Initialize Console"}
              {!loading && <ArrowRight className="ml-auto" />}
            </Button>
          </form>
        </AuthFormCard>
      </div>
    </main>
  );
}
