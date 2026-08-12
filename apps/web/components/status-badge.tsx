import { AlertCircle, CheckCircle2, CircleDashed, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

const statusConfig = {
  success: {
    icon: CheckCircle2,
    className: "border-success/35 bg-success/12 text-success-foreground",
  },
  warning: {
    icon: AlertCircle,
    className: "border-warning/40 bg-warning/14 text-warning-foreground",
  },
  error: { icon: XCircle, className: "border-destructive/35 bg-destructive/10 text-destructive" },
  neutral: { icon: CircleDashed, className: "border-border bg-muted/60 text-muted-foreground" },
} as const;

export type StatusTone = keyof typeof statusConfig;

export function StatusBadge({
  tone = "neutral",
  children,
  pulse = false,
  className,
}: {
  tone?: StatusTone;
  children: ReactNode;
  pulse?: boolean;
  className?: string;
}) {
  const { icon: Icon, className: toneClassName } = statusConfig[tone];

  return (
    <Badge variant="outline" className={cn(toneClassName, className)}>
      <Icon className={cn(pulse && "animate-pulse")} />
      {children}
    </Badge>
  );
}
