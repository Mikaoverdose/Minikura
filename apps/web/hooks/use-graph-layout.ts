"use client";

import { Position } from "@xyflow/react";
import { useMemo } from "react";
import type {
  ProxyMetadata,
  ServerMetadata,
  TopologyEdge,
  TopologyNode,
} from "@/lib/topology-types";

interface LayoutInput {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

export function useGraphLayout({ nodes, edges }: LayoutInput) {
  const layoutedNodes = useMemo(() => {
    const k8sNodes = nodes.filter((n) => n.data.type === "k8s-node");
    const serverNodes = nodes.filter((n) => n.data.type === "server");
    const proxyNodes = nodes.filter((n) => n.data.type === "proxy");

    const nodeSpacing = {
      x: 350,
      y: 350,
    };

    const nodeWidth = 320;
    const layoutedNodesList: TopologyNode[] = [];

    const k8sNodeGroups = new Map<string, TopologyNode[]>();
    const orphanedNodes: TopologyNode[] = [];

    const appNodes = [...serverNodes, ...proxyNodes];

    appNodes.forEach((node) => {
      const metadata = node.data.metadata as ServerMetadata | ProxyMetadata;
      const k8sNodeNames = metadata.k8sNodes || [];

      if (k8sNodeNames.length === 0) {
        orphanedNodes.push(node);
      } else {
        const k8sNodeName = k8sNodeNames[0];
        const k8sNodeId = `k8s-node-${k8sNodeName}`;
        if (!k8sNodeGroups.has(k8sNodeId)) {
          k8sNodeGroups.set(k8sNodeId, []);
        }
        k8sNodeGroups.get(k8sNodeId)?.push(node);
      }
    });

    const k8sWithApps = k8sNodes.filter((k8s) => {
      const group = k8sNodeGroups.get(k8s.id) || [];
      return group.length > 0;
    });

    const k8sWithoutApps = k8sNodes.filter((k8s) => {
      const group = k8sNodeGroups.get(k8s.id) || [];
      return group.length === 0;
    });

    const k8sNodeWidths = new Map<string, number>();
    k8sWithApps.forEach((k8sNode) => {
      const group = k8sNodeGroups.get(k8sNode.id) || [];
      const width = Math.max(nodeWidth, group.length * nodeWidth);
      k8sNodeWidths.set(k8sNode.id, width);
    });

    let currentX = 0;
    const k8sNodePositions = new Map<string, { x: number; width: number }>();

    k8sWithApps.forEach((k8sNode) => {
      const width = k8sNodeWidths.get(k8sNode.id) ?? nodeWidth;
      const centerX = currentX + width / 2;

      k8sNodePositions.set(k8sNode.id, { x: centerX, width });

      layoutedNodesList.push({
        ...k8sNode,
        position: {
          x: centerX,
          y: 0,
        },
        targetPosition: Position.Top,
        sourcePosition: Position.Bottom,
      });

      currentX += width + nodeSpacing.x;
    });

    k8sWithoutApps.forEach((k8sNode) => {
      const centerX = currentX + nodeWidth / 2;

      k8sNodePositions.set(k8sNode.id, { x: centerX, width: nodeWidth });

      layoutedNodesList.push({
        ...k8sNode,
        position: {
          x: centerX,
          y: 0,
        },
        targetPosition: Position.Top,
        sourcePosition: Position.Bottom,
      });

      currentX += nodeWidth + nodeSpacing.x;
    });

    k8sNodeGroups.forEach((group, k8sNodeId) => {
      const k8sPos = k8sNodePositions.get(k8sNodeId);
      if (!k8sPos) return;

      const groupWidth = group.length * nodeWidth;
      const startX = k8sPos.x - groupWidth / 2 + nodeWidth / 2;

      group.forEach((node, index) => {
        const xPos = startX + index * nodeWidth;

        layoutedNodesList.push({
          ...node,
          position: {
            x: xPos,
            y: nodeSpacing.y,
          },
          targetPosition: Position.Top,
          sourcePosition: Position.Bottom,
        });
      });
    });

    orphanedNodes.forEach((node, index) => {
      const xPos = currentX + index * nodeWidth;

      layoutedNodesList.push({
        ...node,
        position: {
          x: xPos,
          y: nodeSpacing.y,
        },
        targetPosition: Position.Top,
        sourcePosition: Position.Bottom,
      });
    });

    if (layoutedNodesList.length > 0) {
      const minX = Math.min(...layoutedNodesList.map((n) => n.position.x));
      const maxX = Math.max(...layoutedNodesList.map((n) => n.position.x));
      const totalWidth = maxX - minX;
      const offsetX = -totalWidth / 2;

      layoutedNodesList.forEach((node) => {
        node.position.x += offsetX;
      });
    }

    return layoutedNodesList;
  }, [nodes]);

  return {
    nodes: layoutedNodes,
    edges,
  };
}
