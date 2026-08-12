"use client";

import { Network, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, PageShell, StatePanel } from "@/components/page-layout";
import { TopologyCanvas } from "@/components/topology/topology-canvas";
import { useTopologyData } from "@/hooks/use-topology-data";

export default function TopologyPage() {
  const { graph, loading, error, refreshing, refresh } = useTopologyData();

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
        <StatePanel
          loading
          title="Loading topology..."
          className="h-[70vh] sm:h-[calc(100vh-250px)]"
        />
      ) : error && !graph ? (
        <StatePanel
          title="Error loading topology"
          description={
            <>
              <p>{error}</p>
              <p className="mt-2 text-xs">Auto-retrying...</p>
            </>
          }
          tone="error"
          className="h-[70vh] sm:h-[calc(100vh-250px)]"
          action={<Button onClick={() => void refresh()}>Retry now</Button>}
        />
      ) : !graph || graph.nodes.length === 0 ? (
        <StatePanel
          title="No infrastructure found"
          description="Create a server to see it appear in the topology."
          className="h-[70vh] sm:h-[calc(100vh-250px)]"
        />
      ) : (
        <div className="space-y-3">
          {error && (
            <div className="flex flex-col gap-2 border border-destructive/40 bg-destructive/10 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <span>Refresh failed: {error}. Showing the last successful topology.</span>
              <Button
                size="sm"
                variant="outline"
                disabled={refreshing}
                onClick={() => void refresh(true)}
              >
                <RefreshCw className={refreshing ? "animate-spin" : undefined} />
                Retry
              </Button>
            </div>
          )}
          <TopologyCanvas graph={graph} />
        </div>
      )}
    </PageShell>
  );
}
