"use client";

import type { NormalServer, ReverseProxyServer, UpdateServerRequest } from "@minikura/api";
import { ArrowLeft } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ServerForm, type ServerFormData } from "@/components/server-form";
import { PageHeader, PageShell, StatePanel } from "@/components/page-layout";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { getReverseProxyApi } from "@/lib/api-helpers";
import { toCommonServerRequestFields, toInitialServerFormData } from "@/lib/server-form/mappings";

export default function EditServerPage() {
  const router = useRouter();
  const params = useParams();
  const serverId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [serverData, setServerData] = useState<NormalServer | null>(null);
  const [resourceKind, setResourceKind] = useState<"server" | "proxy">("server");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchServer = async () => {
      try {
        setLoading(true);

        const normalResponse = await api.api.servers.get();
        if (normalResponse.data) {
          const servers = normalResponse.data as unknown as NormalServer[];
          const server = servers.find((s) => s.id === serverId);
          if (server) {
            setServerData(server);
            setResourceKind("server");
            setLoading(false);
            return;
          }
        }

        const proxyResponse = await getReverseProxyApi().get();
        if (proxyResponse.data) {
          const proxies = proxyResponse.data as unknown as ReverseProxyServer[];
          const proxy = proxies.find((p) => p.id === serverId);
          if (proxy) {
            setServerData(proxy as unknown as NormalServer);
            setResourceKind("proxy");
            setLoading(false);
            return;
          }
        }

        setError("Server not found");
        setLoading(false);
      } catch (_err) {
        setError("Failed to load server data");
        setLoading(false);
      }
    };

    if (serverId) {
      fetchServer();
    }
  }, [serverId]);

  const handleSubmit = async (data: ServerFormData) => {
    if (!serverData) return;

    const payload: UpdateServerRequest = toCommonServerRequestFields(data);

    const response =
      resourceKind === "server"
        ? await api.api.servers({ id: serverId }).patch(payload)
        : await getReverseProxyApi()({ id: serverId }).patch({
            description: payload.description,
            listen_port: payload.listen_port,
            service_type: payload.service_type,
            node_port: payload.node_port,
            memory: payload.memory,
            cpu_request: payload.cpu_request,
            cpu_limit: payload.cpu_limit,
          });

    if (response.error) {
      const errorMsg =
        typeof response.error === "object" &&
        response.error &&
        "value" in response.error &&
        typeof response.error.value === "object" &&
        response.error.value &&
        "message" in response.error.value
          ? String(response.error.value.message)
          : "Failed to update server";
      throw new Error(errorMsg);
    }

    if (resourceKind === "server") {
      const pluginResponse = await api.api.registry
        .servers({ serverId })
        .plugins.put({ artifactIds: data.registryArtifactIds });
      if (pluginResponse.error) throw new Error("Server updated, but plugin deployment failed");
    }

    router.push("/dashboard/servers");
  };

  if (loading) {
    return <StatePanel loading title="Loading server data..." className="min-h-[50vh]" />;
  }

  if (error || !serverData) {
    return (
      <StatePanel
        title={error || "Server not found"}
        tone="error"
        className="min-h-[50vh]"
        action={
          <Button variant="outline" onClick={() => router.push("/dashboard/servers")}>
            <ArrowLeft className="size-4" />
            Back to Servers
          </Button>
        }
      />
    );
  }

  const initialData = toInitialServerFormData(serverData);

  return (
    <PageShell>
      <PageHeader
        eyebrow="Compute / Configure"
        title={<>Edit {serverData.id}</>}
        description="Update the workload specification and deployment behavior."
        leading={
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/servers")}>
            <ArrowLeft className="size-5" />
          </Button>
        }
        className="flex-row items-center justify-start"
      />

      <SectionCard
        title="Server Configuration"
        description="Modify settings for your Minecraft server"
      >
        <ServerForm
          initialData={initialData}
          onSubmit={handleSubmit}
          onCancel={() => router.push("/dashboard/servers")}
          submitLabel="Save Changes"
        />
      </SectionCard>
    </PageShell>
  );
}
