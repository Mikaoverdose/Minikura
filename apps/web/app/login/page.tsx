"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AuthFormCard, FormError } from "@/components/auth/auth-form-card";
import { BrandLockup } from "@/components/brand";
import { FullScreenLoader } from "@/components/page-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient, signIn, useSession } from "@/lib/auth-client";

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
          setError("Signed in, but the session cookie was not accepted. Check the web and API URLs.");
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
      <section className="relative hidden overflow-hidden border-r border-sidebar-border bg-[url('/background.png')] bg-cover bg-center p-10 lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/20" />
        <BrandLockup subtitle="Infrastructure console" className="relative z-10" />

        <div className="relative z-10 max-w-2xl py-20">
          <span className="mb-5 inline-flex items-center gap-2 border border-sidebar-border bg-sidebar-accent px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em]">
            <span className="size-2 bg-sidebar-primary" /> Minecraft operations platform
          </span>
          <h1 className="text-6xl font-black uppercase leading-[0.86] tracking-[-0.065em] xl:text-8xl">
            Orchestrate
            <br />
            <span className="text-sidebar-primary">Every World.</span>
          </h1>
          <p className="mt-7 max-w-lg text-base leading-7 text-sidebar-foreground/55">
            Provision servers, manage proxy routes, and monitor Kubernetes workloads from a single
            operational interface.
          </p>
        </div>

        <p className="relative z-10 font-mono text-[9px] uppercase tracking-[0.2em] text-sidebar-foreground/35">
          Server and cluster administration
        </p>
      </section>

      <section className="flex items-center justify-center bg-background p-5 text-foreground sm:p-10">
        <AuthFormCard
          title="Sign In"
          description="Use your administrator account to access Minikura."
          className="border-2 border-foreground shadow-none"
          headerClassName="border-b"
          contentClassName="pt-2"
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
