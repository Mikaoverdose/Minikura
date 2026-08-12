import type {
  ConnectionInfo,
  K8sNodeSummary,
  NormalServer,
  PodInfo,
  ReverseProxyServer,
} from "@minikura/api";
import { parseK8sMetrics } from "./k8s-metrics";
import type {
  HealthStatus,
  K8sNodeMetadata,
  ProxyMetadata,
  ResourceMetrics,
  ServerMetadata,
  TopologyEdge,
  TopologyGraph,
  TopologyNode,
} from "./topology-types";

function parsePodReady(ready: string): { ready: number; total: number } {
  const [readyStr, totalStr] = ready.split("/");
  return {
    ready: parseInt(readyStr, 10) || 0,
    total: parseInt(totalStr, 10) || 0,
  };
}

function calculateHealthStatus(readyPods: number, totalPods: number): HealthStatus {
  if (totalPods === 0) return "unknown";
  if (readyPods === totalPods) return "healthy";
  if (readyPods > 0) return "degraded";
  return "unhealthy";
}

function getPodMetrics(podName: string, podMetrics: any): ResourceMetrics | undefined {
  if (!podMetrics?.items) return undefined;

  const metric = podMetrics.items.find((m: any) => m.metadata?.name === podName);
  if (!metric?.containers?.[0]?.usage) return undefined;

  const usage = metric.containers[0].usage;
  return parseK8sMetrics(usage.cpu, usage.memory);
}

function getNodeMetrics(nodeName: string, nodeMetrics: any): ResourceMetrics | undefined {
  if (!nodeMetrics?.items) return undefined;

  const metric = nodeMetrics.items.find((m: any) => m.metadata?.name === nodeName);
  if (!metric?.usage) return undefined;

  return parseK8sMetrics(metric.usage.cpu, metric.usage.memory);
}

interface BuildEnhancedGraphInput {
  servers: NormalServer[];
  proxies: ReverseProxyServer[];
  serverPods: Map<string, PodInfo[]>;
  proxyPods: Map<string, PodInfo[]>;
  k8sNodes: K8sNodeSummary[];
  serverConnections?: Map<string, ConnectionInfo | null>;
  proxyConnections?: Map<string, ConnectionInfo | null>;
  proxyBackends?: Map<string, string[]>;
  podMetrics?: any;
  nodeMetrics?: any;
}

function parseProxyServerConnections(
  proxy: ReverseProxyServer,
  allServers: NormalServer[],
  backendsByProxyId?: Map<string, string[]>
): string[] {
  const backends = backendsByProxyId?.get(proxy.id);
  if (!backends) {
    return allServers.map((s) => s.id);
  }
  const known = new Set(allServers.map((s) => s.id));
  return backends.filter((id) => known.has(id));
}

export function buildTopologyGraph(input: BuildEnhancedGraphInput): TopologyGraph {
  const {
    servers,
    proxies,
    serverPods,
    proxyPods,
    k8sNodes,
    serverConnections,
    proxyConnections,
    proxyBackends,
    podMetrics,
    nodeMetrics,
  } = input;

  const nodes: TopologyNode[] = [];
  const edges: TopologyEdge[] = [];

  let healthySystems = 0;
  let degradedSystems = 0;
  let unhealthySystems = 0;

  const serverToProxies = new Map<string, string[]>();
  const proxyToServers = new Map<string, string[]>();
  const serverToK8sNodes = new Map<string, string[]>();
  const proxyToK8sNodes = new Map<string, string[]>();
  const k8sNodeToPods = new Map<string, { servers: string[]; proxies: string[] }>();

  for (const node of k8sNodes) {
    if (node.name) {
      k8sNodeToPods.set(node.name, { servers: [], proxies: [] });
    }
  }

  for (const proxy of proxies) {
    const connectedServerIds = parseProxyServerConnections(proxy, servers, proxyBackends);
    proxyToServers.set(proxy.id, connectedServerIds);

    for (const serverId of connectedServerIds) {
      const existing = serverToProxies.get(serverId) || [];
      existing.push(proxy.id);
      serverToProxies.set(serverId, existing);
    }
  }

  for (const [serverId, pods] of serverPods.entries()) {
    const nodeNames = new Set<string>();
    for (const pod of pods) {
      if (pod.nodeName) {
        nodeNames.add(pod.nodeName);
        const nodeData = k8sNodeToPods.get(pod.nodeName);
        if (nodeData) {
          nodeData.servers.push(pod.name);
        }
      }
    }
    serverToK8sNodes.set(serverId, Array.from(nodeNames));
  }

  for (const [proxyId, pods] of proxyPods.entries()) {
    const nodeNames = new Set<string>();
    for (const pod of pods) {
      if (pod.nodeName) {
        nodeNames.add(pod.nodeName);
        const nodeData = k8sNodeToPods.get(pod.nodeName);
        if (nodeData) {
          nodeData.proxies.push(pod.name);
        }
      }
    }
    proxyToK8sNodes.set(proxyId, Array.from(nodeNames));
  }

  for (const server of servers) {
    const pods = serverPods.get(server.id) || [];
    const readyPods = pods.filter((p) => {
      const { ready, total } = parsePodReady(p.ready);
      return ready === total && p.status.toLowerCase() === "running";
    }).length;
    const health = calculateHealthStatus(readyPods, pods.length);

    if (health === "healthy") healthySystems++;
    else if (health === "degraded") degradedSystems++;
    else if (health === "unhealthy") unhealthySystems++;

    const podMetric = pods[0] ? getPodMetrics(pods[0].name, podMetrics) : undefined;

    const metadata: ServerMetadata = {
      server,
      podCount: pods.length,
      readyPods,
      pods,
      health,
      connectedProxies: serverToProxies.get(server.id) || [],
      k8sNodes: serverToK8sNodes.get(server.id) || [],
      connectionInfo: serverConnections?.get(server.id) || null,
      metrics: podMetric,
    };

    nodes.push({
      id: `server-${server.id}`,
      type: "server",
      position: { x: 0, y: 0 },
      data: {
        id: server.id,
        type: "server",
        label: server.id,
        status: health,
        metadata,
      },
    });
  }

  for (const proxy of proxies) {
    const pods = proxyPods.get(proxy.id) || [];
    const readyPods = pods.filter((p) => {
      const { ready, total } = parsePodReady(p.ready);
      return ready === total && p.status.toLowerCase() === "running";
    }).length;
    const health = calculateHealthStatus(readyPods, pods.length);

    if (health === "healthy") healthySystems++;
    else if (health === "degraded") degradedSystems++;
    else if (health === "unhealthy") unhealthySystems++;

    const connectedServers = proxyToServers.get(proxy.id) || [];
    const proxyPodMetric = pods[0] ? getPodMetrics(pods[0].name, podMetrics) : undefined;

    const metadata: ProxyMetadata = {
      proxy,
      podCount: pods.length,
      readyPods,
      pods,
      health,
      connectedServers,
      k8sNodes: proxyToK8sNodes.get(proxy.id) || [],
      connectionInfo: proxyConnections?.get(proxy.id) || null,
      metrics: proxyPodMetric,
    };

    nodes.push({
      id: `proxy-${proxy.id}`,
      type: "proxy",
      position: { x: 0, y: 0 },
      data: {
        id: proxy.id,
        type: "proxy",
        label: proxy.id,
        status: health,
        metadata,
      },
    });

    for (const serverId of connectedServers) {
      edges.push({
        id: `edge-proxy-${proxy.id}-server-${serverId}`,
        source: `proxy-${proxy.id}`,
        target: `server-${serverId}`,
        type: "smoothstep",
        animated: false,
        data: {
          id: `edge-proxy-${proxy.id}-server-${serverId}`,
          source: `proxy-${proxy.id}`,
          target: `server-${serverId}`,
          type: "proxy-to-server",
          label: "routes to",
          animated: false,
        },
      });
    }
  }

  for (const k8sNode of k8sNodes) {
    if (!k8sNode.name) continue;

    const nodePods = k8sNodeToPods.get(k8sNode.name);
    const podCount = (nodePods?.servers.length || 0) + (nodePods?.proxies.length || 0);

    let nodeHealth: HealthStatus = "healthy";
    if (k8sNode.status.toLowerCase() !== "ready") {
      nodeHealth = "unhealthy";
    }

    const k8sNodeMetric = getNodeMetrics(k8sNode.name, nodeMetrics);

    const metadata: K8sNodeMetadata = {
      node: k8sNode,
      podCount,
      serverPods: nodePods?.servers || [],
      proxyPods: nodePods?.proxies || [],
      health: nodeHealth,
      metrics: k8sNodeMetric,
    };

    nodes.push({
      id: `k8s-node-${k8sNode.name}`,
      type: "k8s-node",
      position: { x: 0, y: 0 },
      data: {
        id: k8sNode.name,
        type: "k8s-node",
        label: k8sNode.name,
        status: nodeHealth,
        metadata,
      },
    });

    for (const [serverId, k8sNodeNames] of serverToK8sNodes.entries()) {
      if (k8sNodeNames.includes(k8sNode.name)) {
        edges.push({
          id: `edge-k8s-${k8sNode.name}-server-${serverId}`,
          source: `k8s-node-${k8sNode.name}`,
          target: `server-${serverId}`,
          type: "smoothstep",
          animated: false,
          data: {
            id: `edge-k8s-${k8sNode.name}-server-${serverId}`,
            source: `k8s-node-${k8sNode.name}`,
            target: `server-${serverId}`,
            type: "pod-to-node",
            label: "hosts",
            animated: false,
          },
        });
      }
    }

    for (const [proxyId, k8sNodeNames] of proxyToK8sNodes.entries()) {
      if (k8sNodeNames.includes(k8sNode.name)) {
        edges.push({
          id: `edge-k8s-${k8sNode.name}-proxy-${proxyId}`,
          source: `k8s-node-${k8sNode.name}`,
          target: `proxy-${proxyId}`,
          type: "smoothstep",
          animated: false,
          data: {
            id: `edge-k8s-${k8sNode.name}-proxy-${proxyId}`,
            source: `k8s-node-${k8sNode.name}`,
            target: `proxy-${proxyId}`,
            type: "pod-to-node",
            label: "hosts",
            animated: false,
          },
        });
      }
    }
  }

  return {
    nodes,
    edges,
    metadata: {
      totalServers: servers.length,
      totalProxies: proxies.length,
      totalK8sNodes: k8sNodes.length,
      totalConnections: edges.length,
      healthySystems,
      degradedSystems,
      unhealthySystems,
    },
  };
}

export function filterNodes(
  nodes: TopologyNode[],
  filters: {
    showServers: boolean;
    showProxies: boolean;
    showK8sNodes: boolean;
    searchQuery: string;
    filterByStatus?: HealthStatus;
  }
): TopologyNode[] {
  return nodes.filter((node) => {
    const { type, label, status } = node.data;

    if (type === "server" && !filters.showServers) return false;
    if (type === "proxy" && !filters.showProxies) return false;
    if (type === "k8s-node" && !filters.showK8sNodes) return false;

    if (filters.searchQuery && !label.toLowerCase().includes(filters.searchQuery.toLowerCase())) {
      return false;
    }

    if (filters.filterByStatus && status !== filters.filterByStatus) {
      return false;
    }

    return true;
  });
}

export function filterEdges(edges: TopologyEdge[], visibleNodeIds: Set<string>): TopologyEdge[] {
  return edges.filter((edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target));
}
