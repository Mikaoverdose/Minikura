import { Loader2 } from "lucide-react";
import type * as React from "react";
import { cn } from "@/lib/cn";

type PageHeaderProps = {
  eyebrow: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  leading?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
};

export function PageShell({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("page-shell", className)} {...props} />;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  leading,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("page-heading", className)}>
      <div className={cn(leading && "flex items-center gap-4")}>
        {leading}
        <div>
          <span className="page-eyebrow">{eyebrow}</span>
          <h1 className="page-title">{title}</h1>
          {description && <p className="page-description">{description}</p>}
        </div>
      </div>
      {actions}
    </header>
  );
}

type StatePanelProps = React.ComponentProps<"div"> & {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  tone?: "default" | "error";
  loading?: boolean;
};

export function StatePanel({
  title,
  description,
  icon,
  action,
  tone = "default",
  loading = false,
  className,
  ...props
}: StatePanelProps) {
  return (
    <div
      className={cn(
        "flex min-h-48 items-center justify-center border border-dashed bg-card/60 p-6 text-center",
        className
      )}
      {...props}
    >
      <div className="flex max-w-lg flex-col items-center gap-2">
        {loading ? (
          <Loader2 className="mb-2 size-7 animate-spin text-muted-foreground" />
        ) : (
          icon && <div className="mb-2 text-muted-foreground">{icon}</div>
        )}
        <p className={cn("font-bold", tone === "error" && "text-destructive")}>{title}</p>
        {description && <div className="text-sm text-muted-foreground">{description}</div>}
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}

export function FullScreenLoader({ label }: { label?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-sidebar text-sidebar-foreground">
      <Loader2 className="size-8 animate-spin text-sidebar-primary" />
      {label && (
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/50">
          {label}
        </span>
      )}
    </div>
  );
}
