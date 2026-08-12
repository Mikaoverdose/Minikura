"use client";

import type { ConnectionInfo, CustomResourceSummary, K8sNodeSummary, PodInfo } from "@minikura/api";
import { getErrorMessage } from "@minikura/shared/errors";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api-client";
import { getReverseProxyApi } from "@/lib/api-helpers";
import type { TopologyGraph } from "@/lib/topology-types";
import { buildTopologyGraph } from "@/lib/topology-utils";
import { useServerList } from "./use-server-list";

const DATABASE_ID_LABEL = "minikura.kirameki.cafe/database-id";

function kubernetesResourceName(id: string): string {
  return id
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "")
    .slice(0, 63);
}

function assertResponse<T>(response: { data?: unknown; error?: unknown }, fallback: string): T {
  if (response.error) throw new Error(getErrorMessage(response.error));
  if (response.data === undefined || response.data === null) throw new Error(fallback);
  return response.data as T;
}

export function useTopologyData() {
  const {
    normalServers,
    reverseProxies,
    loading: serversLoading,
    error: serversError,
  } = useServerList();

  const [graph, setGraph] = useState<TopologyGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const requestSequence = useRef(0);

  const fetchTopologyData = useCallback(
    async (isRefresh = false) => {
      const sequence = ++requestSequence.current;
      if (isRefresh) setRefreshing(true);
      try {
        if (!isRefresh) {
          setLoading(true);
        }
        setError(null);

        const nodesResponse = await api.api.k8s.nodes.get();
        const k8sNodes = assertResponse<K8sNodeSummary[]>(
          nodesResponse,
          "Failed to load Kubernetes nodes"
        );

        const serverPodPromises = normalServers.map(async (server) => {
          try {
            const response = await api.api.k8s.servers({ serverId: server.id }).pods.get();
            return {
              serverId: server.id,
              pods: assertResponse<PodInfo[]>(response, `Failed to load pods for ${server.id}`),
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
              pods: assertResponse<PodInfo[]>(response, `Failed to load pods for ${proxy.id}`),
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
              connectionInfo: assertResponse<ConnectionInfo>(
                response,
                "Connection information unavailable"
              ),
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
              connectionInfo: assertResponse<ConnectionInfo>(
                response,
                "Connection information unavailable"
              ),
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
        const [serverCrResponse, proxyCrResponse] = await Promise.all([
          api.api.k8s["minecraft-servers"].get(),
          api.api.k8s["reverse-proxy-servers"].get(),
        ]);
        const serverCrs = assertResponse<CustomResourceSummary[]>(
          serverCrResponse,
          "Minecraft server status unavailable"
        );
        const proxyCrs = assertResponse<CustomResourceSummary[]>(
          proxyCrResponse,
          "Reverse proxy status unavailable"
        );
        const serverIdByK8sName = new Map(
          normalServers.map((server) => [kubernetesResourceName(server.id), server.id])
        );
        for (const cr of serverCrs) {
          if (!cr.name) continue;
          const databaseId = cr.annotations?.[DATABASE_ID_LABEL] ?? cr.labels?.[DATABASE_ID_LABEL];
          if (databaseId) serverIdByK8sName.set(cr.name, databaseId);
        }

        const proxyIdByK8sName = new Map(
          reverseProxies.map((proxy) => [kubernetesResourceName(proxy.id), proxy.id])
        );
        for (const cr of proxyCrs) {
          if (!cr.name) continue;
          const databaseId = cr.annotations?.[DATABASE_ID_LABEL] ?? cr.labels?.[DATABASE_ID_LABEL];
          if (databaseId) proxyIdByK8sName.set(cr.name, databaseId);
        }

        for (const cr of proxyCrs) {
          const backends = cr.status?.backends;
          const proxyId = cr.name ? proxyIdByK8sName.get(cr.name) : undefined;
          if (proxyId && Array.isArray(backends)) {
            proxyBackends.set(
              proxyId,
              backends
                .filter((id): id is string => typeof id === "string")
                .map((id) => serverIdByK8sName.get(id))
                .filter((id): id is string => Boolean(id))
            );
          }
        }

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

        if (sequence === requestSequence.current) {
          setGraph(topologyGraph);
          setError(null);
        }
      } catch (err) {
        if (sequence === requestSequence.current) setError(getErrorMessage(err));
      } finally {
        if (sequence === requestSequence.current) {
          setIsInitialLoad(false);
          if (!isRefresh) setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [normalServers, reverseProxies]
  );

  useEffect(() => {
    if (!serversLoading && !serversError) {
      fetchTopologyData();
    }
  }, [serversLoading, serversError, fetchTopologyData]);

  useEffect(() => {
    if (serversLoading || isInitialLoad) return;

    const intervalId = setInterval(() => {
      fetchTopologyData(true);
    }, 5000);

    return () => clearInterval(intervalId);
  }, [serversLoading, isInitialLoad, fetchTopologyData]);

  return {
    graph,
    loading: serversLoading || (loading && !serversError),
    error: serversError || error,
    refreshing,
    refresh: fetchTopologyData,
  };
}
