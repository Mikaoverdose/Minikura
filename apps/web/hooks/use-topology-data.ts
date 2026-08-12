"use client";

import type { ConnectionInfo, CustomResourceSummary, K8sNodeSummary, PodInfo } from "@minikura/api";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { getReverseProxyApi } from "@/lib/api-helpers";
import type { TopologyGraph } from "@/lib/topology-types";
import { buildTopologyGraph } from "@/lib/topology-utils";
import { useServerList } from "./use-server-list";

export function useTopologyData() {
  const { normalServers, reverseProxies, loading: serversLoading } = useServerList();

  const [graph, setGraph] = useState<TopologyGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const fetchTopologyData = useCallback(
    async (isRefresh = false) => {
      try {
        if (!isRefresh) {
          setLoading(true);
        }
        setError(null);

        const nodesResponse = await api.api.k8s.nodes.get();
        const k8sNodes = (nodesResponse.data as K8sNodeSummary[]) || [];

        const serverPodPromises = normalServers.map(async (server) => {
          try {
            const response = await api.api.k8s.servers({ serverId: server.id }).pods.get();
            return {
              serverId: server.id,
              pods: (response.data as PodInfo[]) || [],
            };
          } catch (_err) {
            return { serverId: server.id, pods: [] };
          }
        });

        const proxyPodPromises = reverseProxies.map(async (proxy) => {
          try {
            const response = await api.api.k8s["reverse-proxy"]({
              serverId: proxy.id,
            }).pods.get();
            return {
              serverId: proxy.id,
              pods: (response.data as PodInfo[]) || [],
            };
          } catch (_err) {
            return { serverId: proxy.id, pods: [] };
          }
        });

        const [serverPodsResults, proxyPodsResults] = await Promise.all([
          Promise.all(serverPodPromises),
          Promise.all(proxyPodPromises),
        ]);

        const serverPodsMap = new Map<string, PodInfo[]>();
        for (const result of serverPodsResults) {
          serverPodsMap.set(result.serverId, result.pods);
        }

        const proxyPodsMap = new Map<string, PodInfo[]>();
        for (const result of proxyPodsResults) {
          proxyPodsMap.set(result.serverId, result.pods);
        }

        const serverConnectionPromises = normalServers.map(async (server) => {
          try {
            const response = await api.api.servers({ id: server.id })["connection-info"].get();
            return {
              serverId: server.id,
              connectionInfo: response.data as ConnectionInfo,
            };
          } catch (_err) {
            return { serverId: server.id, connectionInfo: null };
          }
        });

        const reverseProxyApi = getReverseProxyApi();
        const proxyConnectionPromises = reverseProxies.map(async (proxy) => {
          try {
            const response = await reverseProxyApi({ id: proxy.id })["connection-info"].get();
            return {
              serverId: proxy.id,
              connectionInfo: response.data as ConnectionInfo,
            };
          } catch (_err) {
            return { serverId: proxy.id, connectionInfo: null };
          }
        });

        const [serverConnectionResults, proxyConnectionResults] = await Promise.all([
          Promise.all(serverConnectionPromises),
          Promise.all(proxyConnectionPromises),
        ]);

        const serverConnectionMap = new Map<string, ConnectionInfo | null>();
        for (const result of serverConnectionResults) {
          serverConnectionMap.set(result.serverId, result.connectionInfo);
        }

        const proxyConnectionMap = new Map<string, ConnectionInfo | null>();
        for (const result of proxyConnectionResults) {
          proxyConnectionMap.set(result.serverId, result.connectionInfo);
        }

        let podMetrics: any = { items: [] };
        let nodeMetrics: any = { items: [] };
        try {
          const [podMetricsRes, nodeMetricsRes] = await Promise.all([
            api.api.k8s.metrics.pods.get(),
            api.api.k8s.metrics.nodes.get(),
          ]);
          podMetrics = podMetricsRes.data || { items: [] };
          nodeMetrics = nodeMetricsRes.data || { items: [] };
        } catch (_err) {}

        const proxyBackends = new Map<string, string[]>();
        try {
          const crResponse = await api.api.k8s["reverse-proxy-servers"].get();
          for (const cr of (crResponse.data as CustomResourceSummary[]) || []) {
            const backends = cr.status?.backends;
            if (cr.name && Array.isArray(backends)) {
              proxyBackends.set(
                cr.name,
                backends.filter((id): id is string => typeof id === "string")
              );
            }
          }
        } catch (_err) {}

        const topologyGraph = buildTopologyGraph({
          servers: normalServers,
          proxies: reverseProxies,
          serverPods: serverPodsMap,
          proxyPods: proxyPodsMap,
          k8sNodes,
          serverConnections: serverConnectionMap,
          proxyConnections: proxyConnectionMap,
          proxyBackends,
          podMetrics,
          nodeMetrics,
        });

        setGraph(topologyGraph);
        setIsInitialLoad(false);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch topology data";
        setError(errorMessage);
      } finally {
        if (!isRefresh) {
          setLoading(false);
        }
      }
    },
    [normalServers, reverseProxies]
  );

  useEffect(() => {
    if (!serversLoading) {
      fetchTopologyData();
    }
  }, [serversLoading, fetchTopologyData]);

  useEffect(() => {
    if (serversLoading || isInitialLoad) return;

    const intervalId = setInterval(() => {
      fetchTopologyData(true);
    }, 5000);

    return () => clearInterval(intervalId);
  }, [serversLoading, isInitialLoad, fetchTopologyData]);

  return {
    graph,
    loading: loading || serversLoading,
    error,
    refresh: fetchTopologyData,
  };
}
