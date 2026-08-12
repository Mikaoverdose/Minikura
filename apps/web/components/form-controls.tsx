"use client";

import { Info } from "lucide-react";
import type * as React from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";

export function HelpTooltip({ content }: { content: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="text-muted-foreground hover:text-foreground">
          <Info className="size-4" />
          <span className="sr-only">More information</span>
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-64">{content}</TooltipContent>
    </Tooltip>
  );
}

export function FormNotice({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-sm border border-dashed p-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}
