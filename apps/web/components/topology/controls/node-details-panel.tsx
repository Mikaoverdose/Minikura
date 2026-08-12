"use client";

import { Box } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type {
  K8sNodeMetadata,
  ProxyMetadata,
  ServerMetadata,
  TopologyNodeData,
} from "@/lib/topology-types";
import { DetailRow, DetailSection, HealthBadge } from "../topology-primitives";

interface NodeDetailsPanelProps {
  node: TopologyNodeData | null;
  open: boolean;
  onClose: () => void;
}

export function NodeDetailsPanel({ node, open, onClose }: NodeDetailsPanelProps) {
  if (!node) return null;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:w-[600px] lg:w-[700px] overflow-y-auto p-6">
        <SheetHeader className="mb-6">
          <SheetTitle>{node.label}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 pr-2">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {node.type === "server"
                  ? "Minecraft Server"
                  : node.type === "proxy"
                    ? "Reverse Proxy"
                    : "Kubernetes Node"}
              </Badge>
              <HealthBadge status={node.status} appearance="detail">
                {node.status}
              </HealthBadge>
            </div>
          </div>

          <Separator />

          {node.type === "server" && <ServerDetails metadata={node.metadata as ServerMetadata} />}
          {node.type === "proxy" && <ProxyDetails metadata={node.metadata as ProxyMetadata} />}
          {node.type === "k8s-node" && (
            <K8sNodeDetails metadata={node.metadata as K8sNodeMetadata} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ServerDetails({ metadata }: { metadata: ServerMetadata }) {
  const { server, podCount, readyPods, pods, k8sNodes, connectedProxies } = metadata;

  return (
    <div className="space-y-4">
      <DetailSection title="Server Configuration">
        <DetailRow label="ID" value={server.id} />
        {server.description && <DetailRow label="Description" value={server.description} />}
        <DetailRow label="Type" value={server.type} />
        <DetailRow label="Jar Type" value={server.jar_type} />
        <DetailRow label="Minecraft Version" value={server.minecraft_version} />
        <DetailRow label="Port" value={server.listen_port.toString()} />
      </DetailSection>

      <DetailSection title="Kubernetes Info">
        <KubernetesWorkloadDetails
          podCount={podCount}
          readyPods={readyPods}
          pods={pods}
          k8sNodes={k8sNodes}
        />
      </DetailSection>

      {connectedProxies.length > 0 && (
        <DetailSection title="Proxy Connections">
          <DetailRow label="Behind Proxies" value={connectedProxies.length.toString()} />
          <IdentifierList
            items={connectedProxies}
            className="text-sm bg-blue-50 border border-blue-200"
          />
        </DetailSection>
      )}

      <DetailSection title="Resources">
        <DetailRow label="Memory" value={`${server.memory_request}MB / ${server.memory}MB`} />
        <DetailRow label="CPU Request" value={server.cpu_request || "Not set"} />
        <DetailRow label="CPU Limit" value={server.cpu_limit || "Not set"} />
      </DetailSection>
    </div>
  );
}

function ProxyDetails({ metadata }: { metadata: ProxyMetadata }) {
  const { proxy, podCount, readyPods, pods, k8sNodes, connectedServers } = metadata;

  return (
    <div className="space-y-4">
      <DetailSection title="Proxy Configuration">
        <DetailRow label="ID" value={proxy.id} />
        {proxy.description && <DetailRow label="Description" value={proxy.description} />}
        <DetailRow label="Type" value={proxy.type} />
        <DetailRow
          label="External Address"
          value={`${proxy.external_address}:${proxy.external_port}`}
        />
        <DetailRow label="Listen Port" value={proxy.listen_port.toString()} />
      </DetailSection>

      <DetailSection title="Kubernetes Info">
        <KubernetesWorkloadDetails
          podCount={podCount}
          readyPods={readyPods}
          pods={pods}
          k8sNodes={k8sNodes}
        />
      </DetailSection>

      <DetailSection title="Connected Servers">
        <DetailRow label="Total" value={connectedServers.length.toString()} />
        {connectedServers.length > 0 && (
          <IdentifierList
            items={connectedServers}
            className="text-sm bg-green-50 border border-green-200"
          />
        )}
      </DetailSection>
    </div>
  );
}

function K8sNodeDetails({ metadata }: { metadata: K8sNodeMetadata }) {
  const { node, podCount, serverPods, proxyPods } = metadata;

  return (
    <div className="space-y-4">
      <DetailSection title="Node Information">
        <DetailRow label="Name" value={node.name || "Unknown"} />
        <DetailRow label="Status" value={node.status} />
        {node.version && <DetailRow label="Version" value={node.version} />}
        {node.internalIP && <DetailRow label="Internal IP" value={node.internalIP} />}
        {node.externalIP && <DetailRow label="External IP" value={node.externalIP} />}
      </DetailSection>

      <DetailSection title="Node Details">
        <DetailRow label="Roles" value={node.roles} />
        <DetailRow label="Age" value={node.age} />
        {node.hostname && <DetailRow label="Hostname" value={node.hostname} />}
      </DetailSection>

      <DetailSection title="Running Pods">
        <DetailRow label="Total Pods" value={podCount.toString()} />
        <DetailRow label="Server Pods" value={serverPods.length.toString()} />
        <DetailRow label="Proxy Pods" value={proxyPods.length.toString()} />

        {serverPods.length > 0 && (
          <div className="mt-3">
            <p className="text-sm font-medium mb-2">Server Pods:</p>
            <IdentifierList
              items={serverPods}
              className="text-xs bg-green-50 border border-green-200"
              withMargin={false}
            />
          </div>
        )}

        {proxyPods.length > 0 && (
          <div className="mt-3">
            <p className="text-sm font-medium mb-2">Proxy Pods:</p>
            <IdentifierList
              items={proxyPods}
              className="text-xs bg-blue-50 border border-blue-200"
              withMargin={false}
            />
          </div>
        )}
      </DetailSection>
    </div>
  );
}

function KubernetesWorkloadDetails({
  podCount,
  readyPods,
  pods,
  k8sNodes,
}: Pick<ServerMetadata, "podCount" | "readyPods" | "pods" | "k8sNodes">) {
  return (
    <>
      <DetailRow label="Pods" value={`${readyPods}/${podCount} Ready`} />
      {k8sNodes.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm mb-2">
            <Box className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Running on {k8sNodes.length} K8s node(s):</span>
          </div>
          <IdentifierList
            items={k8sNodes}
            className="text-xs bg-blue-50 border border-blue-200 ml-6"
            withMargin={false}
          />
        </div>
      )}
      {pods.map((pod) => (
        <div key={pod.name} className="text-sm mt-2 p-2 bg-muted rounded">
          <div className="font-medium font-mono text-xs break-all">{pod.name}</div>
          <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
            <div>
              Status: {pod.status} • {pod.ready}
            </div>
            <div>Restarts: {pod.restarts}</div>
            {pod.nodeName && (
              <div className="flex items-center gap-1">
                <Box className="h-3 w-3 shrink-0" />
                <span className="break-all">Node: {pod.nodeName}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </>
  );
}

function IdentifierList({
  items,
  className,
  withMargin = true,
}: {
  items: string[];
  className: string;
  withMargin?: boolean;
}) {
  return (
    <div className={withMargin ? "mt-2 space-y-1" : "space-y-1"}>
      {items.map((item) => (
        <div key={item} className={`p-2 rounded font-mono break-all ${className}`}>
          {item}
        </div>
      ))}
    </div>
  );
}
