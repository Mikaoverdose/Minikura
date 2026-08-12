import type * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";

type SectionCardProps = React.ComponentProps<typeof Card> & {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  headerAction?: React.ReactNode;
  contentClassName?: string;
};

export function SectionCard({
  title,
  description,
  icon,
  headerAction,
  children,
  className,
  contentClassName,
  ...props
}: SectionCardProps) {
  return (
    <Card className={className} {...props}>
      <CardHeader className="border-b">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {icon}
            <CardTitle>{title}</CardTitle>
          </div>
          {headerAction}
        </div>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  );
}

type ResourceSectionProps = SectionCardProps & {
  count: number;
  emptyIcon: React.ReactNode;
  emptyTitle: string;
  emptyDescription: string;
};

export function ResourceSection({
  count,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  children,
  ...props
}: ResourceSectionProps) {
  return (
    <SectionCard
      {...props}
      headerAction={
        <span className="font-mono text-xs font-bold">{String(count).padStart(2, "0")}</span>
      }
    >
      {count === 0 ? (
        <div className="flex h-36 flex-col items-center justify-center border border-dashed bg-muted/30 text-center">
          <div className="mb-3 text-muted-foreground">{emptyIcon}</div>
          <p className="font-bold uppercase">{emptyTitle}</p>
          <p className="mt-1 text-xs text-muted-foreground">{emptyDescription}</p>
        </div>
      ) : (
        children
      )}
    </SectionCard>
  );
}

export function TableActions({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex items-center justify-end gap-2", className)} {...props} />;
}
