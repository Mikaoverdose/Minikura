"use client";

import type { NormalServer, PodInfo } from "@minikura/api";
import { ArrowLeft, Play, RefreshCw, ServerIcon, Square } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader, PageShell, StatePanel } from "@/components/page-layout";
import { SectionCard } from "@/components/section-card";
import { Terminal } from "@/components/terminal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api-client";

export default function ManageServerPage() {
  const router = useRouter();
  const serverId = useParams<{ id: string }>().id;
  const [server, setServer] = useState<NormalServer | null>(null);
  const [pods, setPods] = useState<PodInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    const [serverResponse, podsResponse] = await Promise.all([
      api.api.servers({ id: serverId }).get(),
      api.api.k8s.servers({ serverId }).pods.get(),
    ]);
    if (serverResponse.error) throw serverResponse.error;
    if (podsResponse.error) throw podsResponse.error;
    setServer(serverResponse.data as NormalServer);
    setPods((podsResponse.data ?? []) as PodInfo[]);
  };

  useEffect(() => {
    void Promise.all([
      api.api.servers({ id: serverId }).get(),
      api.api.k8s.servers({ serverId }).pods.get(),
    ])
      .then(([serverResponse, podsResponse]) => {
        if (serverResponse.error) throw serverResponse.error;
        if (podsResponse.error) throw podsResponse.error;
        setServer(serverResponse.data as NormalServer);
        setPods((podsResponse.data ?? []) as PodInfo[]);
      })
      .catch(() => setError("Unable to load server operations"))
      .finally(() => setLoading(false));
  }, [serverId]);

  const action = async (kind: "start" | "stop" | "restart") => {
    setActing(true);
    setError(null);
    try {
      const response = await api.api.servers({ id: serverId }).actions[kind].post();
      if (response.error) throw response.error;
      await refresh();
    } catch {
      setError(`Failed to ${kind} server`);
    } finally {
      setActing(false);
    }
  };

  if (loading)
    return <StatePanel loading title="Loading server operations..." className="min-h-[50vh]" />;
  if (!server) return <StatePanel title="Server not found" tone="error" />;

  const pod = pods.find((candidate) => candidate.status === "Running") ?? pods[0];
  const running = server.running !== false;

  return (
    <PageShell>
      <PageHeader
        eyebrow="Workloads / Operations"
        title={server.id}
        description="Live console access and workload lifecycle controls."
        leading={
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/servers")}>
            <ArrowLeft className="size-5" />
          </Button>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={running ? "default" : "secondary"}>
              {running ? "Desired: running" : "Stopped"}
            </Badge>
            {running ? (
              <>
                <Button
                  variant="outline"
                  disabled={acting || !pod}
                  onClick={() => void action("restart")}
                >
                  <RefreshCw className="size-4" /> Restart
                </Button>
                <Button variant="destructive" disabled={acting} onClick={() => void action("stop")}>
                  <Square className="size-4" /> Stop
                </Button>
              </>
            ) : (
              <Button disabled={acting} onClick={() => void action("start")}>
                <Play className="size-4" /> Start
              </Button>
            )}
          </div>
        }
        className="flex-row items-center justify-start"
      />

      {error && (
        <p className="border-l-2 border-destructive pl-3 text-sm text-destructive">{error}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="border bg-card p-4">
          <p className="font-mono text-[10px] uppercase text-muted-foreground">Pod</p>
          <p className="mt-1 truncate font-bold">{pod?.name ?? "Not scheduled"}</p>
        </div>
        <div className="border bg-card p-4">
          <p className="font-mono text-[10px] uppercase text-muted-foreground">Runtime</p>
          <p className="mt-1 font-bold">
            {server.jar_type} {server.minecraft_version}
          </p>
        </div>
        <div className="border bg-card p-4">
          <p className="font-mono text-[10px] uppercase text-muted-foreground">Status</p>
          <p className="mt-1 font-bold">
            {pod ? `${pod.status} · ${pod.ready} ready` : running ? "Starting" : "Stopped"}
          </p>
        </div>
      </div>

      <SectionCard
        title="Console"
        description="Attach to Minecraft output, send server commands, or open a container shell."
        icon={<ServerIcon className="size-5 text-primary" />}
        headerAction={
          <Button variant="ghost" size="sm" disabled={acting} onClick={() => void refresh()}>
            <RefreshCw className="size-4" /> Refresh
          </Button>
        }
        contentClassName="p-0"
      >
        {!pod ? (
          <StatePanel
            title={running ? "Waiting for the Minecraft pod" : "Server is stopped"}
            description={
              running
                ? "Refresh once Kubernetes has scheduled the workload."
                : "Start the server to access logs and console."
            }
            className="m-6 min-h-72"
          />
        ) : (
          <Tabs defaultValue="console" className="gap-0">
            <TabsList className="mx-5 mt-4 sm:mx-6">
              <TabsTrigger value="console">Live Console</TabsTrigger>
              <TabsTrigger value="shell">Container Shell</TabsTrigger>
            </TabsList>
            <TabsContent value="console" className="h-[34rem] bg-black p-2">
              <Terminal
                key={`${pod.name}-console`}
                podName={pod.name}
                container="minecraft"
                mode="console"
              />
            </TabsContent>
            <TabsContent value="shell" className="h-[34rem] bg-black p-2">
              <Terminal
                key={`${pod.name}-shell`}
                podName={pod.name}
                container="minecraft"
                mode="shell"
              />
            </TabsContent>
          </Tabs>
        )}
      </SectionCard>
    </PageShell>
  );
}
