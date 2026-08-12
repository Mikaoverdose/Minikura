import { StatusBadge, type StatusTone } from "@/components/status-badge";

const phaseTones: Record<string, StatusTone> = {
  Running: "success",
  Succeeded: "success",
  Failed: "error",
  Pending: "warning",
  Unknown: "neutral",
};

export function K8sPhaseBadge({ phase }: { phase?: string }) {
  if (!phase) {
    return <StatusBadge>Unknown</StatusBadge>;
  }

  return <StatusBadge tone={phaseTones[phase] ?? "neutral"}>{phase}</StatusBadge>;
}
