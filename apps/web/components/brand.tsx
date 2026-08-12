import { cn } from "@/lib/cn";

type BrandMarkProps = {
  className?: string;
  inverted?: boolean;
};

export function BrandMark({ className, inverted = false }: BrandMarkProps) {
  return (
    <div
      className={cn(
        "grid size-11 shrink-0 place-items-center border font-mono text-lg font-black",
        inverted
          ? "border-foreground bg-foreground text-background"
          : "border-sidebar-primary bg-sidebar-primary text-sidebar-primary-foreground",
        className
      )}
    >
      M
    </div>
  );
}

type BrandLockupProps = BrandMarkProps & {
  subtitle: string;
  compact?: boolean;
  textClassName?: string;
};

export function BrandLockup({ subtitle, compact, className, textClassName }: BrandLockupProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <BrandMark className={compact ? "size-9 text-sm" : undefined} />
      <div className={textClassName}>
        <p className={cn("font-black uppercase tracking-[0.14em]", compact ? "text-base" : "text-lg")}>
          Minikura
        </p>
        <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-current/45">{subtitle}</p>
      </div>
    </div>
  );
}
