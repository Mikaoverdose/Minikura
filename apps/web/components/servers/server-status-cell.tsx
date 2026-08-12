"use client";

import type { PodInfo } from "@minikura/api";
import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { api } from "@/lib/api-client";

type ServerStatusCellProps = {
  serverId: string;
  type: "normal" | "proxy";
};

export function ServerStatusCell({ serverId, type }: ServerStatusCellProps) {
  const [pods, setPods] = useState<PodInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPods = async () => {
      try {
        const endpoint =
          type === "normal"
            ? api.api.k8s.servers({ serverId }).pods.get
            : api.api.k8s["reverse-proxy"]({ serverId }).pods.get;
        const res = await endpoint();
        if (res.data) {
          setPods(res.data as PodInfo[]);
        }
      } catch (_error) {
      } finally {
        setLoading(false);
      }
    };
    fetchPods();
  }, [serverId, type]);

  if (loading) {
    return <StatusBadge pulse>Checking</StatusBadge>;
  }

  if (pods.length === 0) {
    return <StatusBadge>No pods</StatusBadge>;
  }

  const allRunning = pods.every((pod) => pod.status === "Running");
  const readyCount = pods.filter((pod) => pod.ready === "1/1").length;

  return (
    <StatusBadge tone={allRunning ? "success" : "warning"}>
      {readyCount}/{pods.length} ready
    </StatusBadge>
  );
}
