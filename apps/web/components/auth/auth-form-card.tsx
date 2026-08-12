import type * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";

type AuthFormCardProps = {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
};

export function AuthFormCard({
  title,
  description,
  children,
  className,
  headerClassName,
  contentClassName,
}: AuthFormCardProps) {
  return (
    <Card className={cn("w-full max-w-md", className)}>
      <CardHeader className={cn("space-y-3", headerClassName)}>
        <CardTitle className="text-3xl tracking-[-0.035em]">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="border-l-4 border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      {message}
    </div>
  );
}
