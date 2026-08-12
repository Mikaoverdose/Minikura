import type { NodeProps } from "@xyflow/react";
import { Box, Cpu, HardDrive, Server } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import type { ServerMetadata, TopologyNodeData } from "@/lib/topology-types";
import { CompactRow, CopyableCode, MetricRow, TopologyNodeCard } from "../topology-primitives";

export function ServerNode({ data, selected }: NodeProps) {
  const nodeData = data as TopologyNodeData;
  const metadata = nodeData.metadata as ServerMetadata;
  const { server, readyPods, podCount, health } = metadata;
  const { k8sNodes, connectedProxies, connectionInfo, metrics, pods } = metadata;
  const restartCount = pods.reduce((sum, pod) => sum + (pod.restarts || 0), 0);

  return (
    <TopologyNodeCard
      selected={selected}
      icon={<Server className="h-4 w-4 text-primary" />}
      iconClassName="bg-primary/10"
      title={server.id}
      description={server.description}
      health={health}
    >
      <div className="flex flex-wrap gap-1">
        <Badge variant="outline" className="text-[10px] h-5">
          {server.jar_type}
        </Badge>
        <Badge variant="outline" className="text-[10px] h-5">
          MC {server.minecraft_version}
        </Badge>
        <Badge variant="outline" className="text-[10px] h-5">
          {server.type}
        </Badge>
        {connectionInfo && (
          <Badge variant="outline" className="text-[10px] h-5">
            {connectionInfo.type}
          </Badge>
        )}
      </div>

      <CompactRow
        label="Pods"
        className="text-xs bg-muted/50 rounded px-2 py-1.5"
        valueClassName={cn(
          "font-semibold",
          readyPods === podCount ? "text-green-600" : "text-yellow-600"
        )}
      >
        {readyPods}/{podCount}
      </CompactRow>

      <div className="space-y-1 text-[11px]">
        <MetricRow
          label="Memory"
          icon={<HardDrive className="h-3 w-3" />}
          usage={metrics?.memoryUsage}
          limit={`${server.memory_request}/${server.memory}MB`}
        />
        <MetricRow
          label="CPU"
          icon={<Cpu className="h-3 w-3" />}
          usage={metrics?.cpuUsage}
          limit={`${server.cpu_request || "N/A"}/${server.cpu_limit || "N/A"}`}
        />
      </div>

      {connectionInfo?.connectionString && (
        <div className="space-y-1 text-[11px] pt-1 border-t">
          <CopyableCode value={connectionInfo.connectionString} />
          {connectionInfo.note && (
            <p className="text-[10px] text-muted-foreground italic">{connectionInfo.note}</p>
          )}
        </div>
      )}

      {pods.length > 0 && (
        <div className="space-y-1 text-[11px] pt-1 border-t">
          <CompactRow
            label="Restarts"
            valueClassName={restartCount > 0 ? "text-yellow-600" : "text-green-600"}
          >
            {restartCount}
          </CompactRow>
          {pods[0]?.age && <CompactRow label="Age">{pods[0].age}</CompactRow>}
          {pods[0]?.ip && (
            <CompactRow label="Pod IP" valueClassName="font-mono text-[10px]">
              {pods[0].ip}
            </CompactRow>
          )}
        </div>
      )}

      {(k8sNodes.length > 0 || connectedProxies.length > 0) && (
        <div className="space-y-1 text-[11px] pt-1 border-t">
          {connectedProxies.length > 0 && (
            <CompactRow label="Exposed By" valueClassName="font-semibold text-blue-600">
              {connectedProxies.length} proxies
            </CompactRow>
          )}
          {k8sNodes.length > 0 && (
            <CompactRow label="K8s Node" icon={<Box className="h-3 w-3" />}>
              {k8sNodes[0]}
            </CompactRow>
          )}
        </div>
      )}
    </TopologyNodeCard>
  );
}
