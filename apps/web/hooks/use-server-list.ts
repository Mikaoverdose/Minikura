"use client";

import type { NormalServer, ReverseProxyServer } from "@minikura/api";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { getReverseProxyApi } from "@/lib/api-helpers";

export function useServerList() {
  const [normalServers, setNormalServers] = useState<NormalServer[]>([]);
  const [reverseProxies, setReverseProxies] = useState<ReverseProxyServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServers = useCallback(async () => {
    setError(null);
    try {
      const [normalRes, proxyRes] = await Promise.all([
        api.api.servers.get(),
        getReverseProxyApi().get(),
      ]);

      if (normalRes.data) {
        setNormalServers(normalRes.data as unknown as NormalServer[]);
      }
      if (proxyRes.data) {
        setReverseProxies(proxyRes.data as unknown as ReverseProxyServer[]);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to load servers");
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteServer = useCallback(
    async (id: string, type: "normal" | "proxy") => {
      if (type === "normal") {
        await api.api.servers({ id }).delete();
      } else {
        await getReverseProxyApi()({ id }).delete();
      }
      await fetchServers();
    },
    [fetchServers]
  );

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  return {
    normalServers,
    reverseProxies,
    loading,
    error,
    refresh: fetchServers,
    deleteServer,
  };
}
