"use client";

import { ArrowRight, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AuthFormCard, FormError } from "@/components/auth/auth-form-card";
import { BrandMark } from "@/components/brand";
import { FullScreenLoader } from "@/components/page-layout";
import { ThemeToggle } from "@/components/theme-toggle";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api-client";

export default function BootstrapPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [error, setError] = useState("");

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
      <div className="grid w-full max-w-5xl overflow-hidden border border-sidebar-border bg-background text-foreground shadow-[12px_12px_0_color-mix(in_oklch,var(--sidebar-primary)_18%,transparent)] lg:grid-cols-[0.8fr_1.2fr]">
        <section className="flex flex-col justify-between bg-primary p-8 text-primary-foreground sm:p-10">
          <BrandMark inverted />
          <div className="my-16">
            <span className="page-eyebrow text-primary-foreground/60">System bootstrap / 01</span>
            <h1 className="text-5xl font-black uppercase leading-[0.9] tracking-[-0.055em]">
              Build your command center.
            </h1>
            <p className="mt-5 text-sm leading-6 text-primary-foreground/65">
              The first account controls users, workloads, routing, and cluster visibility.
            </p>
          </div>
          <div className="space-y-3 font-mono text-[10px] font-bold uppercase tracking-[0.12em]">
            <p className="flex items-center gap-2">
              <Check className="size-3" /> Admin authority
            </p>
            <p className="flex items-center gap-2">
              <Check className="size-3" /> Secure session
            </p>
            <p className="flex items-center gap-2">
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
