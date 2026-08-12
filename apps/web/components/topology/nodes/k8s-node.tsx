import type { NodeProps } from "@xyflow/react";
import { Box, Cpu, HardDrive, Network, Server as ServerIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { K8sNodeMetadata, TopologyNodeData } from "@/lib/topology-types";
import { CompactRow, TopologyNodeCard } from "../topology-primitives";

export function K8sNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as TopologyNodeData;
  const metadata = nodeData.metadata as K8sNodeMetadata;
  const { node, podCount, serverPods, proxyPods, health, metrics } = metadata;

  return (
    <TopologyNodeCard
      selected={selected}
      icon={<Box className="h-4 w-4 text-info" />}
      iconClassName="bg-info/10"
      title={node.name || "Unknown"}
      description="Kubernetes Node"
      health={health}
    >
      <div className="flex flex-wrap gap-1">
        <Badge variant="outline" className="text-[10px] h-5">
          {node.status}
        </Badge>
        {node.version && (
          <Badge variant="outline" className="text-[10px] h-5">
            {node.version}
          </Badge>
        )}
        <Badge variant="outline" className="text-[10px] h-5">
          {node.roles}
        </Badge>
      </div>

      <CompactRow
        label="Total Pods"
        className="text-xs bg-muted/50 rounded px-2 py-1.5"
        valueClassName="font-semibold text-info"
      >
        {podCount}
      </CompactRow>

      <div className="space-y-1 text-[11px]">
        <CompactRow label="Server Pods" icon={<ServerIcon className="h-3 w-3" />}>
          {serverPods.length}
        </CompactRow>
        <CompactRow label="Proxy Pods" icon={<Network className="h-3 w-3" />}>
          {proxyPods.length}
        </CompactRow>
      </div>

      {metrics && (metrics.cpuUsage || metrics.memoryUsage) && (
        <div className="space-y-1 text-[11px] pt-1 border-t">
          {metrics.cpuUsage && (
            <CompactRow
              label="CPU"
              icon={<Cpu className="h-3 w-3" />}
              valueClassName="font-semibold text-xs text-info"
            >
              {metrics.cpuUsage}
            </CompactRow>
          )}
          {metrics.memoryUsage && (
            <CompactRow
              label="Memory"
              icon={<HardDrive className="h-3 w-3" />}
              valueClassName="font-semibold text-xs text-info"
            >
              {metrics.memoryUsage}
            </CompactRow>
          )}
        </div>
      )}

      <div className="space-y-1 text-[11px] pt-1 border-t">
        <CompactRow label="Age">{node.age}</CompactRow>
        {node.hostname && (
          <CompactRow label="Hostname" valueClassName="font-mono text-[10px] truncate">
            {node.hostname}
          </CompactRow>
        )}
      </div>

      {(node.internalIP || node.externalIP) && (
        <div className="space-y-1 text-[11px] pt-1 border-t">
          {node.internalIP && (
            <CompactRow label="Internal IP" valueClassName="font-mono text-[10px]">
              {node.internalIP}
            </CompactRow>
          )}
          {node.externalIP && (
            <CompactRow label="External IP" valueClassName="font-mono text-[10px]">
              {node.externalIP}
            </CompactRow>
          )}
        </div>
      )}
    </TopologyNodeCard>
  );
}
