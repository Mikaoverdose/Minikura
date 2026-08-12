import type { NodeProps } from "@xyflow/react";
import { Box, Cpu, Globe, HardDrive, Network } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import type { ProxyMetadata, TopologyNodeData } from "@/lib/topology-types";
import { CompactRow, CopyableCode, MetricRow, TopologyNodeCard } from "../topology-primitives";

export function ProxyNode({ data, selected }: NodeProps) {
  const nodeData = data as TopologyNodeData;
  const metadata = nodeData.metadata as ProxyMetadata;
  const { proxy, readyPods, podCount, health, connectedServers } = metadata;
  const { k8sNodes, connectionInfo, metrics, pods } = metadata;
  const restartCount = pods.reduce((sum, pod) => sum + (pod.restarts || 0), 0);

  return (
    <TopologyNodeCard
      selected={selected}
      icon={<Globe className="h-4 w-4 text-info" />}
      iconClassName="bg-info/10"
      title={proxy.id}
      description={proxy.description}
      health={health}
    >
      <div className="flex flex-wrap gap-1">
        <Badge variant="outline" className="text-[10px] h-5">
          {proxy.type}
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
          readyPods === podCount ? "text-success" : "text-warning"
        )}
      >
        {readyPods}/{podCount}
      </CompactRow>

      {proxy.node_port && (
        <div className="space-y-1 text-[11px]">
          <CompactRow label="NodePort" icon={<Network className="h-3 w-3" />}>
            {proxy.node_port}
          </CompactRow>
        </div>
      )}

      {connectionInfo?.connectionString && (
        <div className="space-y-1 text-[11px] pt-1 border-t">
          <CompactRow label="Address" />
          <CopyableCode value={connectionInfo.connectionString} />
          {connectionInfo.note && (
            <p className="text-[10px] text-muted-foreground italic">{connectionInfo.note}</p>
          )}
        </div>
      )}

      <div className="space-y-1 text-[11px] pt-1 border-t">
        <MetricRow
          label="Memory"
          icon={<HardDrive className="h-3 w-3" />}
          usage={metrics?.memoryUsage}
          limit={`${proxy.memory}MB`}
        />
        <MetricRow
          label="CPU"
          icon={<Cpu className="h-3 w-3" />}
          usage={metrics?.cpuUsage}
          limit={`${proxy.cpu_request || "N/A"}/${proxy.cpu_limit || "N/A"}`}
        />
      </div>

      {pods.length > 0 && (
        <div className="space-y-1 text-[11px] pt-1 border-t">
          <CompactRow
            label="Restarts"
            valueClassName={restartCount > 0 ? "text-warning" : "text-success"}
          >
            {restartCount}
          </CompactRow>
          {pods[0]?.age && <CompactRow label="Age">{pods[0].age}</CompactRow>}
          {pods[0]?.ip && (
            <CompactRow label="Pod IP" valueClassName="font-mono text-[10px]">
              {pods[0].ip}
            </CompactRow>
          )}
          <CompactRow label="Routing To" valueClassName="font-semibold text-info">
            {connectedServers.length} servers
          </CompactRow>
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
