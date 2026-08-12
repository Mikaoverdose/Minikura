"use client";

import { Globe, Plus, Server, ServerCog } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PageHeader, PageShell, StatePanel } from "@/components/page-layout";
import { ResourceSection } from "@/components/section-card";
import { ServerTable } from "@/components/servers/server-table";
import { Button } from "@/components/ui/button";
import { useServerList } from "@/hooks/use-server-list";
import { useSession } from "@/lib/auth-client";

export default function ServersPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = session?.user.role === "admin";
  const { normalServers, reverseProxies, loading, error, deleteServer } = useServerList();
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    type: "normal" | "proxy";
  } | null>(null);

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await deleteServer(deleteTarget.id, deleteTarget.type);
      setDeleteTarget(null);
    } catch (_error) {}
  };

  return (
    <PageShell>
      <PageHeader
        eyebrow="Workloads"
        title="Servers"
        description="Provision Minecraft runtimes and route traffic through edge proxies."
        actions={
          isAdmin ? (
            <Button size="lg" onClick={() => router.push("/dashboard/servers/create")}>
              <Plus className="size-4" />
              Create Server
            </Button>
          ) : undefined
        }
      />

      {loading ? (
        <StatePanel loading title="Discovering workloads..." className="h-64" />
      ) : error ? (
        <StatePanel title="Unable to load workloads" description={error} tone="error" />
      ) : (
        <>
          <ResourceSection
            title="Minecraft Workloads"
            description="Manage your normal Minecraft server instances"
            icon={<ServerCog className="size-5 text-primary" />}
            count={normalServers.length}
            emptyIcon={<Server className="size-6" />}
            emptyTitle="No workloads"
            emptyDescription="Create a server to begin."
          >
            <ServerTable
              type="normal"
              servers={normalServers}
              onEdit={isAdmin ? (id) => router.push(`/dashboard/servers/edit/${id}`) : undefined}
              onDelete={isAdmin ? (id) => setDeleteTarget({ id, type: "normal" }) : undefined}
            />
          </ResourceSection>

          <ResourceSection
            title="Edge Proxies"
            description="Manage your Velocity and BungeeCord proxy servers"
            icon={<Globe className="size-5 text-primary" />}
            count={reverseProxies.length}
            emptyIcon={<Globe className="size-6" />}
            emptyTitle="No edge proxies"
            emptyDescription="Proxy workloads will appear here."
          >
            <ServerTable
              type="proxy"
              servers={reverseProxies}
              onEdit={isAdmin ? (id) => router.push(`/dashboard/servers/edit/${id}`) : undefined}
              onDelete={isAdmin ? (id) => setDeleteTarget({ id, type: "proxy" }) : undefined}
            />
          </ResourceSection>
        </>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Server"
        description={
          <>
            Are you sure you want to delete this{" "}
            {deleteTarget?.type === "normal" ? "server" : "reverse proxy"}? This action cannot be
            undone.
          </>
        }
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      />
    </PageShell>
  );
}
