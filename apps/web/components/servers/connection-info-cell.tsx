"use client";

import type { ConnectionInfo } from "@minikura/api";
import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { api } from "@/lib/api-client";
import { getReverseProxyApi } from "@/lib/api-helpers";

type ConnectionInfoCellProps = {
  serverId: string;
  type: "normal" | "proxy";
};

export function ConnectionInfoCell({ serverId, type }: ConnectionInfoCellProps) {
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchConnectionInfo = async () => {
      try {
        const reverseProxyApi = getReverseProxyApi();
        const endpoint =
          type === "normal"
            ? api.api.servers({ id: serverId })["connection-info"]
            : reverseProxyApi({ id: serverId })["connection-info"];
        const res = await endpoint.get();
        if (res.data) {
          setConnectionInfo(res.data as ConnectionInfo);
        }
      } catch (_error) {
      } finally {
        setLoading(false);
      }
    };
    fetchConnectionInfo();
  }, [serverId, type]);

  const handleCopy = async () => {
    if (connectionInfo?.connectionString) {
      await navigator.clipboard.writeText(connectionInfo.connectionString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return <span className="text-muted-foreground text-xs">Loading...</span>;
  }

  if (!connectionInfo) {
    return <span className="text-muted-foreground text-xs">N/A</span>;
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-1">
        <Badge variant="secondary" className="w-fit text-xs">
          {connectionInfo.type}
        </Badge>
        {connectionInfo.connectionString && (
          <div className="flex items-center gap-1">
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
              {connectionInfo.connectionString}
            </code>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={handleCopy}
                  aria-label="Copy connection string"
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{copied ? "Copied!" : "Copy to clipboard"}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}
        {connectionInfo.note && (
          <p className="text-xs text-muted-foreground">{connectionInfo.note}</p>
        )}
      </div>
    </TooltipProvider>
  );
}
