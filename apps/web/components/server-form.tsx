"use client";

import { useEffect, useState } from "react";
import { AdvancedPanel } from "@/components/server-form/advanced-panel";
import { AutomationPanel } from "@/components/server-form/automation-panel";
import { BasicPanel } from "@/components/server-form/basic-panel";
import { ModsPanel } from "@/components/server-form/mods-panel";
import { NetworkPanel } from "@/components/server-form/network-panel";
import { PerformancePanel } from "@/components/server-form/performance-panel";
import { PlayersPanel } from "@/components/server-form/players-panel";
import { ResourcesPanel } from "@/components/server-form/resources-panel";
import { ServerPanel } from "@/components/server-form/server-panel";
import type { ServerFormData, UpdateServerField } from "@/components/server-form/types";
import { WorldPanel } from "@/components/server-form/world-panel";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api-client";

export type {
  Difficulty,
  EnvVar,
  Mode,
  ServerFormData,
  ServerType,
  ServiceType,
} from "@/components/server-form/types";

interface ServerFormProps {
  initialData?: Partial<ServerFormData>;
  onSubmit: (data: ServerFormData) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
  loading?: boolean;
}

export function ServerForm({
  initialData,
  onSubmit,
  onCancel,
  submitLabel = "Create Server",
  loading = false,
}: ServerFormProps) {
  const defaultType = initialData?.type || "PAPER";
  const defaultVersion = defaultType === "CUSTOM" ? "" : initialData?.version || "LATEST";
  const [formData, setFormData] = useState<ServerFormData>({
    id: initialData?.id || "",
    description: initialData?.description || "",
    memoryLimit: initialData?.memoryLimit || "2048",
    memoryRequest: initialData?.memoryRequest || "1024",
    cpuRequest: initialData?.cpuRequest || "500m",
    cpuLimit: initialData?.cpuLimit || "2",
    type: defaultType,
    version: defaultVersion,
    eula: initialData?.eula ?? true,
    listenPort: initialData?.listenPort || "25565",
    serviceType: initialData?.serviceType || "CLUSTER_IP",
    difficulty: initialData?.difficulty || "easy",
    mode: initialData?.mode || "survival",
    maxPlayers: initialData?.maxPlayers || "20",
    pvp: initialData?.pvp ?? true,
    onlineMode: initialData?.onlineMode ?? true,
    allowFlight: initialData?.allowFlight ?? false,
    enableCommandBlock: initialData?.enableCommandBlock ?? false,
    spawnProtection: initialData?.spawnProtection || "16",
    viewDistance: initialData?.viewDistance || "10",
    simulationDistance: initialData?.simulationDistance || "10",
    levelName: initialData?.levelName || "world",
    hardcore: initialData?.hardcore ?? false,
    spawnAnimals: initialData?.spawnAnimals ?? true,
    spawnMonsters: initialData?.spawnMonsters ?? true,
    spawnNpcs: initialData?.spawnNpcs ?? true,
    enableWhitelist: initialData?.enableWhitelist ?? false,
    useAikarFlags: initialData?.useAikarFlags ?? false,
    useMeowiceFlags: initialData?.useMeowiceFlags ?? false,
    resourcePackEnforce: initialData?.resourcePackEnforce ?? false,
    enableRcon: initialData?.enableRcon ?? true,
    rconPort: initialData?.rconPort || "25575",
    enableQuery: initialData?.enableQuery ?? false,
    queryPort: initialData?.queryPort || "25565",
    enableAutopause: initialData?.enableAutopause ?? false,
    autopauseTimeoutEst: initialData?.autopauseTimeoutEst || "3600",
    autopauseTimeoutInit: initialData?.autopauseTimeoutInit || "600",
    autopauseTimeoutKn: initialData?.autopauseTimeoutKn || "120",
    autopausePeriod: initialData?.autopausePeriod || "10",
    autopauseKnockInterface: initialData?.autopauseKnockInterface || "eth0",
    enableAutostop: initialData?.enableAutostop ?? false,
    autostopTimeoutEst: initialData?.autostopTimeoutEst || "3600",
    autostopTimeoutInit: initialData?.autostopTimeoutInit || "1800",
    autostopPeriod: initialData?.autostopPeriod || "10",
    removeOldPlugins: initialData?.removeOldPlugins ?? false,
    registryArtifactIds: initialData?.registryArtifactIds ?? [],
    timezone: initialData?.timezone || "UTC",
    uid: initialData?.uid || "1000",
    gid: initialData?.gid || "1000",
    enableJmx: initialData?.enableJmx ?? false,
    stopDuration: initialData?.stopDuration || "60",
    customJarUrl: initialData?.customJarUrl || "",
    envVars: (initialData?.envVars || []).map((envVar) => ({
      id: envVar.id || crypto.randomUUID(),
      key: envVar.key,
      value: envVar.value,
    })),
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialData?.id) return;
    void api.api.registry
      .servers({ serverId: initialData.id })
      .plugins.get()
      .then(({ data, error: responseError }) => {
        if (responseError) throw responseError;
        const plugins = (data ?? []) as Array<{ artifact_id: string }>;
        setFormData((previous) => ({
          ...previous,
          registryArtifactIds: plugins.map((plugin) => plugin.artifact_id),
        }));
      })
      .catch(() => setError("Failed to load deployed registry plugins"));
  }, [initialData?.id]);

  const updateField: UpdateServerField = (key, value) => {
    setFormData((previous) => ({ ...previous, [key]: value }));
  };

  const addEnvVar = () => {
    setFormData((previous) => ({
      ...previous,
      envVars: [...previous.envVars, { id: crypto.randomUUID(), key: "", value: "" }],
    }));
  };

  const removeEnvVar = (index: number) => {
    setFormData((previous) => ({
      ...previous,
      envVars: previous.envVars.filter((_, envVarIndex) => envVarIndex !== index),
    }));
  };

  const updateEnvVar = (index: number, field: "key" | "value", value: string) => {
    setFormData((previous) => {
      const envVars = [...previous.envVars];
      envVars[index] = { ...envVars[index], [field]: value };
      return { ...previous, envVars };
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!formData.id.trim()) {
      setError("Server ID is required");
      return;
    }
    if (!/^[a-zA-Z0-9-_]+$/.test(formData.id)) {
      setError("ID must be alphanumeric with - or _");
      return;
    }
    if (!formData.eula) {
      setError("You must accept the Minecraft EULA to create a server");
      return;
    }
    if (formData.type === "CUSTOM" && !formData.customJarUrl?.trim()) {
      setError("Custom jar URL is required for custom servers");
      return;
    }

    try {
      await onSubmit(formData);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "An error occurred");
    }
  };

  const panelProps = { formData, updateField };

  return (
    <form onSubmit={handleSubmit} className="server-form space-y-6">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="flex w-full justify-start overflow-x-auto">
          <TabsTrigger value="basic">Basic</TabsTrigger>
          <TabsTrigger value="server">Server</TabsTrigger>
          <TabsTrigger value="world">World</TabsTrigger>
          <TabsTrigger value="players">Players</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="mods">Mods/Plugins</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
          <TabsTrigger value="network">Network</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>
        <BasicPanel {...panelProps} />
        <ServerPanel {...panelProps} />
        <WorldPanel {...panelProps} />
        <PlayersPanel {...panelProps} />
        <PerformancePanel {...panelProps} />
        <ModsPanel {...panelProps} />
        <ResourcesPanel {...panelProps} />
        <AutomationPanel {...panelProps} />
        <NetworkPanel {...panelProps} />
        <AdvancedPanel
          {...panelProps}
          addEnvVar={addEnvVar}
          removeEnvVar={removeEnvVar}
          updateEnvVar={updateEnvVar}
        />
      </Tabs>

      {error && (
        <div className="border-l-4 border-destructive bg-destructive/10 px-4 py-3 text-destructive">
          {error}
        </div>
      )}
      <div className="flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row">
        <Button type="submit" size="lg" disabled={loading}>
          {loading ? "Saving..." : submitLabel}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
