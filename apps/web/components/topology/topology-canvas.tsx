"use client";

import { Background, BackgroundVariant, Controls, MiniMap, Panel, ReactFlow } from "@xyflow/react";
import { useTheme } from "next-themes";
import { useCallback, useMemo, useState } from "react";
import "@xyflow/react/dist/style.css";
import { useGraphLayout } from "@/hooks/use-graph-layout";
import type { TopologyFilters, TopologyGraph, TopologyNodeData } from "@/lib/topology-types";
import { filterEdges, filterNodes } from "@/lib/topology-utils";
import { NodeDetailsPanel } from "./controls/node-details-panel";
import { TopologyToolbar } from "./controls/topology-toolbar";
import { nodeTypes } from "./nodes/node-types";

interface TopologyCanvasProps {
  graph: TopologyGraph;
}

export function TopologyCanvas({ graph }: TopologyCanvasProps) {
  const { resolvedTheme } = useTheme();
  const [selectedNode, setSelectedNode] = useState<TopologyNodeData | null>(null);
  const [filters, setFilters] = useState<TopologyFilters>({
    showServers: true,
    showProxies: true,
    showK8sNodes: true,
    showConnections: true,
    searchQuery: "",
  });

  const filteredNodes = useMemo(() => {
    return filterNodes(graph.nodes, filters);
  }, [graph.nodes, filters]);

  const filteredEdges = useMemo(() => {
    if (!filters.showConnections) return [];
    const visibleNodeIds = new Set(filteredNodes.map((node) => node.id));
    return filterEdges(graph.edges, visibleNodeIds);
  }, [graph.edges, filteredNodes, filters.showConnections]);

  const { nodes, edges } = useGraphLayout({
    nodes: filteredNodes,
    edges: filteredEdges,
  });

  const onNodeClick = useCallback((_event: React.MouseEvent, node: any) => {
    setSelectedNode(node.data as TopologyNodeData);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setSelectedNode(null);
  }, []);

  return (
    <div className="h-[calc(100vh-250px)] min-h-[520px] w-full overflow-hidden rounded-sm border-2 border-foreground bg-background shadow-[6px_6px_0_color-mix(in_oklch,var(--foreground)_14%,transparent)]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        fitView
        fitViewOptions={{
          padding: 0.2,
          includeHiddenNodes: false,
          minZoom: 0.1,
          maxZoom: 1.5,
        }}
        minZoom={0.1}
        maxZoom={1.5}
        colorMode={resolvedTheme === "dark" ? "dark" : "light"}
        defaultEdgeOptions={{
          animated: false,
          type: "smoothstep",
          style: {
            stroke: "var(--muted-foreground)",
            strokeWidth: 2,
            strokeDasharray: "5 5",
          },
          markerEnd: {
            type: "arrowclosed",
            color: "var(--muted-foreground)",
            width: 20,
            height: 20,
          },
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Lines} color="var(--border)" gap={32} size={1} />
        <Controls
          showZoom
          showFitView
          showInteractive
          className="border bg-card/95 shadow-md backdrop-blur-sm"
        />
        <MiniMap
          nodeColor={(node: any) => {
            const data = node.data as TopologyNodeData;
            const colors = {
              healthy: "#22c55e",
              degraded: "#eab308",
              unhealthy: "#ef4444",
              unknown: "#94a3b8",
            };
            return colors[data.status] || "#94a3b8";
          }}
          maskColor="color-mix(in oklch, var(--foreground) 8%, transparent)"
          className="border bg-card/95 shadow-md backdrop-blur-sm"
        />

        <Panel position="top-left">
          <div className="m-2">
            <TopologyToolbar
              filters={filters}
              onFiltersChange={setFilters}
              metadata={graph.metadata}
            />
          </div>
        </Panel>
      </ReactFlow>

      <NodeDetailsPanel
        node={selectedNode}
        open={selectedNode !== null}
        onClose={handleCloseDetails}
      />
    </div>
  );
}
