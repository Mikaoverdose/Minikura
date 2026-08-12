import type { TopologyEdge, TopologyNode } from "@/lib/topology-types";

const LAYOUT_CONFIG = {
  TIER_SPACING: 300,
  NODE_SPACING: 250,
  START_X: 150,
  START_Y: 100,
} as const;

export function applyHierarchicalLayout(
  nodes: TopologyNode[],
  edges: TopologyEdge[]
): { nodes: TopologyNode[]; edges: TopologyEdge[] } {
  const proxyNodes = nodes.filter((n) => n.data.type === "proxy");
  const serverNodes = nodes.filter((n) => n.data.type === "server");

  const layoutedNodes: TopologyNode[] = [];

  const maxNodesInTier = Math.max(proxyNodes.length, serverNodes.length);
  const tierWidth = maxNodesInTier * LAYOUT_CONFIG.NODE_SPACING;

  const proxyOffsetX = (tierWidth - proxyNodes.length * LAYOUT_CONFIG.NODE_SPACING) / 2;
  proxyNodes.forEach((node, index) => {
    const x = LAYOUT_CONFIG.START_X + proxyOffsetX + index * LAYOUT_CONFIG.NODE_SPACING;
    const y = LAYOUT_CONFIG.START_Y;

    layoutedNodes.push({
      ...node,
      position: { x, y },
    });
  });

  const serverOffsetX = (tierWidth - serverNodes.length * LAYOUT_CONFIG.NODE_SPACING) / 2;
  serverNodes.forEach((node, index) => {
    const x = LAYOUT_CONFIG.START_X + serverOffsetX + index * LAYOUT_CONFIG.NODE_SPACING;
    const y = LAYOUT_CONFIG.START_Y + LAYOUT_CONFIG.TIER_SPACING;

    layoutedNodes.push({
      ...node,
      position: { x, y },
    });
  });

  return {
    nodes: layoutedNodes,
    edges,
  };
}

export function applyGridLayout(
  nodes: TopologyNode[],
  edges: TopologyEdge[]
): { nodes: TopologyNode[]; edges: TopologyEdge[] } {
  const columns = Math.ceil(Math.sqrt(nodes.length));

  const layoutedNodes = nodes.map((node, index) => ({
    ...node,
    position: {
      x: LAYOUT_CONFIG.START_X + (index % columns) * LAYOUT_CONFIG.NODE_SPACING,
      y: LAYOUT_CONFIG.START_Y + Math.floor(index / columns) * LAYOUT_CONFIG.TIER_SPACING,
    },
  }));

  return {
    nodes: layoutedNodes,
    edges,
  };
}

export function layoutTopologyGraph(
  nodes: TopologyNode[],
  edges: TopologyEdge[]
): { nodes: TopologyNode[]; edges: TopologyEdge[] } {
  if (nodes.length === 0) {
    return { nodes: [], edges: [] };
  }

  if (nodes.length < 20) {
    return applyHierarchicalLayout(nodes, edges);
  }

  return applyGridLayout(nodes, edges);
}
