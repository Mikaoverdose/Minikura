"use client";

import { Package } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { api } from "@/lib/api-client";
import type { ServerFormPanelProps } from "./types";

type Artifact = {
  id: string;
  provider: string;
  name: string;
  version: string;
  filename: string;
};

export function ArtifactSelector({ formData, updateField }: ServerFormPanelProps) {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api.api.registry.artifacts
      .get()
      .then(({ data, error: responseError }) => {
        if (responseError) throw responseError;
        setArtifacts((data ?? []) as Artifact[]);
      })
      .catch((loadError) =>
        setError(loadError instanceof Error ? loadError.message : "Failed to load plugins")
      );
  }, []);

  const toggle = (artifactId: string, checked: boolean) => {
    updateField(
      "registryArtifactIds",
      checked
        ? [...new Set([...formData.registryArtifactIds, artifactId])]
        : formData.registryArtifactIds.filter((id) => id !== artifactId)
    );
  };

  return (
    <div className="space-y-3 border p-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h3 className="font-bold">Plugin Library</h3>
          <p className="text-sm text-muted-foreground">
            Select stored artifacts to deploy when this server is saved.
          </p>
        </div>
        <Badge variant="outline">{formData.registryArtifactIds.length} selected</Badge>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {artifacts.length === 0 ? (
        <div className="flex items-center gap-3 border border-dashed p-4 text-sm text-muted-foreground">
          <Package className="size-5" /> Store or upload plugins from the global Plugins page first.
        </div>
      ) : (
        <div className="grid max-h-72 gap-2 overflow-y-auto md:grid-cols-2">
          {artifacts.map((artifact) => {
            const checked = formData.registryArtifactIds.includes(artifact.id);
            return (
              <div
                key={artifact.id}
                className="flex items-start gap-3 border bg-background p-3 hover:border-primary"
              >
                <Checkbox
                  id={`artifact-${artifact.id}`}
                  checked={checked}
                  onCheckedChange={(value) => toggle(artifact.id, value === true)}
                />
                <label htmlFor={`artifact-${artifact.id}`} className="min-w-0 cursor-pointer">
                  <span className="block truncate text-sm font-bold">{artifact.name}</span>
                  <span className="block truncate font-mono text-[10px] text-muted-foreground">
                    {artifact.provider} · {artifact.version} · {artifact.filename}
                  </span>
                </label>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
