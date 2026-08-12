"use client";

import { Handle, Position } from "@xyflow/react";
import { Check, Copy } from "lucide-react";
import type { MouseEvent, ReactNode } from "react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { HealthStatus } from "@/lib/topology-types";

const healthLabels: Record<HealthStatus, string> = {
  healthy: "Healthy",
  degraded: "Degraded",
  unhealthy: "Unhealthy",
  unknown: "Unknown",
};

const solidHealthClasses: Record<Exclude<HealthStatus, "unknown">, string> = {
  healthy: "bg-green-500 hover:bg-green-600",
  degraded: "bg-yellow-500 hover:bg-yellow-600",
  unhealthy: "bg-red-500 hover:bg-red-600",
};

interface HealthBadgeProps {
  status: HealthStatus;
  appearance?: "solid" | "summary" | "detail";
  children?: ReactNode;
  className?: string;
}

export function HealthBadge({
  status,
  appearance = "solid",
  children,
  className,
}: HealthBadgeProps) {
  const content = children ?? healthLabels[status];

  if (appearance === "summary") {
    const indicatorClasses = {
      healthy: "bg-green-500",
      degraded: "bg-yellow-500",
      unhealthy: "bg-red-500",
      unknown: "bg-gray-400",
    }[status];

    return (
      <Badge variant="outline" className={cn("flex items-center gap-1", className)}>
        <span className={cn("h-2 w-2 rounded-full", indicatorClasses)} />
        {content}
      </Badge>
    );
  }

  if (appearance === "detail") {
    return (
      <Badge
        variant={
          status === "healthy" ? "default" : status === "degraded" ? "secondary" : "destructive"
        }
        className={className}
      >
        {content}
      </Badge>
    );
  }

  if (status === "unknown") {
    return (
      <Badge variant="secondary" className={cn("text-xs", className)}>
        {content}
      </Badge>
    );
  }

  return <Badge className={cn(solidHealthClasses[status], "text-xs", className)}>{content}</Badge>;
}

interface TopologyNodeCardProps {
  selected: boolean;
  icon: ReactNode;
  iconClassName: string;
  title: ReactNode;
  description?: ReactNode;
  health: HealthStatus;
  children: ReactNode;
}

export function TopologyNodeCard({
  selected,
  icon,
  iconClassName,
  title,
  description,
  health,
  children,
}: TopologyNodeCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-3 shadow-md hover:shadow-lg transition-all w-[300px]",
        selected && "ring-2 ring-primary ring-offset-2 shadow-xl"
      )}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-gray-400" />
      <div className="space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className={cn("rounded-md p-1.5", iconClassName)}>{icon}</div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate">{title}</p>
              {description && (
                <p className="text-xs text-muted-foreground truncate">{description}</p>
              )}
            </div>
          </div>
          <HealthBadge status={health} />
        </div>
        {children}
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-gray-400" />
    </div>
  );
}

interface CompactRowProps {
  label: ReactNode;
  icon?: ReactNode;
  children?: ReactNode;
  className?: string;
  valueClassName?: string;
}

export function CompactRow({ label, icon, children, className, valueClassName }: CompactRowProps) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <span className={cn("text-muted-foreground", icon && "flex items-center gap-1")}>
        {icon}
        {label}
      </span>
      {children !== undefined && (
        <span className={cn("font-medium", valueClassName)}>{children}</span>
      )}
    </div>
  );
}

interface MetricRowProps {
  label: string;
  icon: ReactNode;
  usage?: string;
  limit: ReactNode;
}

export function MetricRow({ label, icon, usage, limit }: MetricRowProps) {
  return (
    <CompactRow label={label} icon={icon} valueClassName="text-xs">
      {usage && <span className="text-blue-600">{usage} / </span>}
      <span className="text-muted-foreground">{limit}</span>
    </CompactRow>
  );
}

export function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-sm">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

export function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between items-start text-sm gap-4">
      <span className="text-muted-foreground shrink-0">{label}:</span>
      <span className="font-medium text-right break-words">{value}</span>
    </div>
  );
}

interface CopyableCodeProps {
  value: string;
  title?: string;
}

export function CopyableCode({ value, title = "Copy address" }: CopyableCodeProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-1">
      <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono flex-1 truncate">
        {value}
      </code>
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 shrink-0"
        onClick={handleCopy}
        title={copied ? "Copied!" : title}
      >
        {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
      </Button>
    </div>
  );
}
