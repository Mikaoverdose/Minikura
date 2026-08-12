"use client";

import { Network } from "lucide-react";
import { PageHeader, PageShell, StatePanel } from "@/components/page-layout";
import { TopologyCanvas } from "@/components/topology/topology-canvas";
import { useTopologyData } from "@/hooks/use-topology-data";

export default function TopologyPage() {
  const { graph, loading, error } = useTopologyData();

  const header = (
    <PageHeader
      eyebrow="Network / Live Graph"
      title="Topology"
      description="Real-time server infrastructure, proxy connections, and Kubernetes nodes"
      leading={
        <div className="border border-foreground bg-primary p-3 shadow-[3px_3px_0_var(--foreground)]">
          <Network className="size-6 text-primary-foreground" />
        </div>
      }
    />
  );

  return (
    <PageShell>
      {header}
      {loading ? (
        <StatePanel loading title="Loading topology..." className="h-[calc(100vh-250px)]" />
      ) : error ? (
        <StatePanel
          title="Error loading topology"
          description={
            <>
              <p>{error}</p>
              <p className="mt-2 text-xs">Auto-retrying...</p>
            </>
          }
          tone="error"
          className="h-[calc(100vh-250px)]"
        />
      ) : !graph || graph.nodes.length === 0 ? (
        <StatePanel
          title="No infrastructure found"
          description="Create a server to see it appear in the topology."
          className="h-[calc(100vh-250px)]"
        />
      ) : (
        <TopologyCanvas graph={graph} />
      )}
    </PageShell>
  );
}
