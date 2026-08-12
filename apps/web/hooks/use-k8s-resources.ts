"use client";

import type {
  CustomResourceSummary,
  DeploymentInfo,
  K8sConfigMapSummary,
  K8sServiceSummary,
  K8sStatus,
  PodInfo,
  StatefulSetInfo,
} from "@minikura/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api-client";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error) {
    const value = "value" in error ? error.value : error;
    if (typeof value === "object" && value && "message" in value) {
      return String(value.message);
    }
  }

  return "Failed to fetch Kubernetes resources";
}

export function useK8sResources() {
  const [status, setStatus] = useState<K8sStatus | null>(null);
  const [pods, setPods] = useState<PodInfo[]>([]);
  const [statefulSets, setStatefulSets] = useState<StatefulSetInfo[]>([]);
  const [deployments, setDeployments] = useState<DeploymentInfo[]>([]);
  const [services, setServices] = useState<K8sServiceSummary[]>([]);
  const [configMaps, setConfigMaps] = useState<K8sConfigMapSummary[]>([]);
  const [minecraftServers, setMinecraftServers] = useState<CustomResourceSummary[]>([]);
  const [reverseProxyServers, setReverseProxyServers] = useState<CustomResourceSummary[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoaded = useRef(false);

  const fetchData = useCallback(async () => {
    const isInitialLoad = !hasLoaded.current;

    if (!isInitialLoad) {
      setRefreshing(true);
    }
    setError(null);

    try {
      const [
        statusRes,
        podsRes,
        deploymentsRes,
        statefulSetsRes,
        servicesRes,
        configMapsRes,
        minecraftServersRes,
        reverseProxyServersRes,
      ] = await Promise.allSettled([
        api.api.k8s.status.get(),
        api.api.k8s.pods.get(),
        api.api.k8s.deployments.get(),
        api.api.k8s.statefulsets.get(),
        api.api.k8s.services.get(),
        api.api.k8s.configmaps.get(),
        api.api.k8s["minecraft-servers"].get(),
        api.api.k8s["reverse-proxy-servers"].get(),
      ]);

      if (statusRes.status === "fulfilled" && statusRes.value.data) {
        setStatus(statusRes.value.data as K8sStatus);
      }

      if (podsRes.status === "fulfilled" && podsRes.value.data) {
        setPods(podsRes.value.data as PodInfo[]);
      }

      if (statefulSetsRes.status === "fulfilled" && statefulSetsRes.value.data) {
        setStatefulSets(statefulSetsRes.value.data as StatefulSetInfo[]);
      }

      if (deploymentsRes.status === "fulfilled" && deploymentsRes.value.data) {
        setDeployments(deploymentsRes.value.data as DeploymentInfo[]);
      }

      if (servicesRes.status === "fulfilled" && servicesRes.value.data) {
        setServices(servicesRes.value.data as K8sServiceSummary[]);
      }

      if (configMapsRes.status === "fulfilled" && configMapsRes.value.data) {
        setConfigMaps(configMapsRes.value.data as K8sConfigMapSummary[]);
      }

      if (minecraftServersRes.status === "fulfilled" && minecraftServersRes.value.data) {
        setMinecraftServers(minecraftServersRes.value.data as CustomResourceSummary[]);
      }

      if (reverseProxyServersRes.status === "fulfilled" && reverseProxyServersRes.value.data) {
        setReverseProxyServers(reverseProxyServersRes.value.data as CustomResourceSummary[]);
      }

      const failedRequest = [
        statusRes,
        podsRes,
        deploymentsRes,
        statefulSetsRes,
        servicesRes,
        configMapsRes,
        minecraftServersRes,
        reverseProxyServersRes,
      ].find((result) => result.status === "rejected" || Boolean(result.value.error));

      if (failedRequest) {
        setError(
          getErrorMessage(
            failedRequest.status === "rejected" ? failedRequest.reason : failedRequest.value.error
          )
        );
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      hasLoaded.current = true;
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
    const interval = setInterval(() => {
      void fetchData();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return {
    status,
    pods,
    statefulSets,
    deployments,
    services,
    configMaps,
    minecraftServers,
    reverseProxyServers,
    initialLoading,
    refreshing,
    error,
    refresh: fetchData,
  };
}
