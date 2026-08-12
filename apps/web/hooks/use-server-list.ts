"use client";

import type { NormalServer, ReverseProxyServer } from "@minikura/api";
import { getErrorMessage } from "@minikura/shared/errors";
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

      if (normalRes.error) throw normalRes.error;
      if (proxyRes.error) throw proxyRes.error;

      if (normalRes.data) {
        setNormalServers(normalRes.data as unknown as NormalServer[]);
      }
      if (proxyRes.data) {
        setReverseProxies(proxyRes.data as unknown as ReverseProxyServer[]);
      }
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteServer = useCallback(
    async (id: string, type: "normal" | "proxy") => {
      if (type === "normal") {
        const response = await api.api.servers({ id }).delete();
        if (response.error) throw response.error;
      } else {
        const response = await getReverseProxyApi()({ id }).delete();
        if (response.error) throw response.error;
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
