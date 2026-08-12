"use client";

import type * as React from "react";
import { FadeIn, Stagger, useShake } from "@/components/motion";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/cn";

type AuthFormCardProps = {
  title: string;
  description: string;
  children: React.ReactNode;
  leading?: React.ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
};

export function AuthFormCard({
  title,
  description,
  children,
  leading,
  className,
  headerClassName,
  contentClassName,
}: AuthFormCardProps) {
  return (
    <FadeIn y={20} x={12} duration={0.65} className="flex w-full justify-center">
      <Card className={cn("w-full max-w-md gap-0 overflow-hidden py-6", className)}>
        <header className={cn("px-5 pb-6 sm:px-6", headerClassName)}>
          <div className={cn(leading && "flex items-start gap-3.5")}>
            {leading}
            <div className="min-w-0">
              <h2 className="text-[1.75rem] leading-none font-black tracking-[-0.045em]">
                {title}
              </h2>
              <p className="mt-1.5 max-w-[34ch] text-sm leading-5 text-muted-foreground">
                {description}
              </p>
            </div>
          </div>
        </header>
        <CardContent className={contentClassName}>
          <Stagger y={10} stagger={0.05} delay={0.12} selector=":scope > *, :scope > form > *">
            {children}
          </Stagger>
        </CardContent>
      </Card>
    </FadeIn>
  );
}

export function FormError({ message }: { message?: string | null }) {
  const ref = useShake(message);

  if (!message) return null;

  return (
    <div
      ref={ref}
      role="alert"
      className="border-l-4 border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      {message}
    </div>
  );
}
